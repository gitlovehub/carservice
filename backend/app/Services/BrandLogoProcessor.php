<?php

namespace App\Services;

use GdImage;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Logo hãng xe từ link ảnh Admin dán vào → PNG 256×256 nền trong suốt, cắt gọn sát logo.
 *
 * Tự nhận dạng nền:
 *  - đã trong suốt (PNG có alpha)  → giữ nguyên, chỉ cắt gọn;
 *  - nền "ca-rô giả" in vào ảnh     → xóa ô ca-rô theo đúng chu kỳ ô (kể cả ca-rô trong lỗ chữ / vòng);
 *  - nền một màu (trắng, đen…)      → xóa vùng màu nền NỐI VỚI MÉP ẢNH (phần cùng màu bên trong logo được giữ).
 * Nền phức tạp (ảnh chụp, nhiều màu) → báo lỗi để Admin dùng ảnh khác.
 */
class BrandLogoProcessor
{
    public const SIZE = 256;

    private const MARGIN = 4;

    private const MAX_BYTES = 5 * 1024 * 1024;

    private const MAX_PIXELS = 40_000_000;

    /** Cạnh lớn nhất khi xử lý ảnh thường (logo cuối chỉ 256px, nhỏ lại cho nhanh). */
    private const WORK_SIDE = 640;

    /** Ảnh ca-rô xử lý ở kích thước gốc (thu nhỏ làm nhòe ô) — giới hạn để không quá chậm. */
    private const CHECKER_MAX_SIDE = 1600;

    /** Tải ảnh từ link (chặn địa chỉ nội bộ) rồi xử lý. Trả về PNG (bytes). */
    public function fromUrl(string $url): string
    {
        return $this->process($this->download($url));
    }

    /** Xử lý ảnh (bytes bất kỳ định dạng GD đọc được) thành PNG logo 256×256. */
    public function process(string $bytes): string
    {
        $info = @getimagesizefromstring($bytes);
        if ($info === false) {
            $this->fail('Link không phải ảnh hợp lệ (PNG, JPG, WebP…).');
        }
        if ($info[0] * $info[1] > self::MAX_PIXELS) {
            $this->fail('Ảnh quá lớn, hãy dùng ảnh nhỏ hơn.');
        }
        $source = @imagecreatefromstring($bytes);
        if (! $source instanceof GdImage) {
            $this->fail('Không đọc được ảnh này.');
        }
        imagepalettetotruecolor($source);

        // Ca-rô phải nhận dạng trên ảnh gốc: thu nhỏ trước sẽ làm ô lệch, không còn đều.
        $checker = $this->detectChecker($source);
        if ($checker !== null && max(imagesx($source), imagesy($source)) > self::CHECKER_MAX_SIDE) {
            $this->fail('Ảnh nền ca-rô quá lớn, hãy dùng ảnh nhỏ hơn hoặc PNG nền trong suốt.');
        }

        $image = $this->workingCopy($source, $checker !== null ? self::CHECKER_MAX_SIDE : self::WORK_SIDE);
        $w = imagesx($image);
        $h = imagesy($image);
        $pixels = $this->readPixels($image, $w, $h);

        $background = $checker !== null
            ? $this->checkerMask($pixels, $w, $h, $checker)
            : $this->backgroundMask($pixels, $w, $h);
        $this->applyMask($image, $pixels, $background, $w, $h);

        return $this->fitToSquare($image, $pixels, $background, $w, $h);
    }

    /** Kiểm tra chuỗi base64 Admin gửi lên đúng là PNG logo do bước xử lý tạo ra. Trả về base64 sạch. */
    public function assertProcessedPng(string $base64): string
    {
        $clean = preg_replace('/^data:image\/png;base64,/', '', trim($base64));
        $bytes = base64_decode((string) $clean, true);
        $info = $bytes === false ? false : @getimagesizefromstring($bytes);
        if ($info === false || $info['mime'] !== 'image/png' || $info[0] !== self::SIZE || $info[1] !== self::SIZE) {
            throw ValidationException::withMessages(['logo_png' => 'Logo không hợp lệ, hãy bấm "Xử lý ảnh" lại.']);
        }

        return base64_encode($bytes);
    }

    /* ------------------------------------------------------------------ Tải ảnh */

    private function download(string $url, int $redirects = 0): string
    {
        $parts = parse_url(trim($url));
        $scheme = strtolower($parts['scheme'] ?? '');
        $host = $parts['host'] ?? '';
        if (! in_array($scheme, ['http', 'https'], true) || $host === '') {
            $this->fail('Link phải bắt đầu bằng http:// hoặc https://');
        }
        $this->assertPublicHost($host);

        try {
            $response = Http::timeout(15)->connectTimeout(6)
                ->withHeaders(['Accept' => 'image/*', 'User-Agent' => 'CarService-LogoFetcher/1.0'])
                ->withOptions(['allow_redirects' => false])
                ->get($url);
        } catch (Throwable) {
            $this->fail('Không tải được ảnh từ link này.');
        }

        // Tự theo chuyển hướng (tối đa 3 lần), kiểm tra lại địa chỉ ở mỗi lần.
        if ($response->redirect() && $redirects < 3 && ($next = $response->header('Location'))) {
            $next = str_starts_with($next, 'http') ? $next : "{$scheme}://{$host}".(str_starts_with($next, '/') ? '' : '/').$next;

            return $this->download($next, $redirects + 1);
        }
        if (! $response->successful()) {
            $this->fail("Không tải được ảnh (mã lỗi {$response->status()}).");
        }
        $body = $response->body();
        if ($body === '' || strlen($body) > self::MAX_BYTES) {
            $this->fail('Ảnh rỗng hoặc lớn hơn 5MB.');
        }

        return $body;
    }

    /** Chỉ tải từ địa chỉ Internet công khai (chặn localhost, mạng nội bộ — tránh dùng link để dò máy chủ). */
    private function assertPublicHost(string $host): void
    {
        $host = trim($host, '[]');
        $ips = filter_var($host, FILTER_VALIDATE_IP) ? [$host] : (gethostbynamel($host) ?: []);
        if ($ips === []) {
            $this->fail('Không tìm thấy máy chủ của link ảnh.');
        }
        foreach ($ips as $ip) {
            if (! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                $this->fail('Link ảnh trỏ tới địa chỉ nội bộ, không được phép.');
            }
        }
    }

    /* ------------------------------------------------------------------ Đọc ảnh */

    private function workingCopy(GdImage $source, int $maxSide): GdImage
    {
        $w = imagesx($source);
        $h = imagesy($source);
        $scale = min(1, $maxSide / max($w, $h));
        $nw = max(1, (int) round($w * $scale));
        $nh = max(1, (int) round($h * $scale));

        $image = imagecreatetruecolor($nw, $nh);
        imagealphablending($image, false);
        imagesavealpha($image, true);
        imagefill($image, 0, 0, imagecolorallocatealpha($image, 0, 0, 0, 127));
        $scale < 1
            ? imagecopyresampled($image, $source, 0, 0, 0, 0, $nw, $nh, $w, $h)
            : imagecopy($image, $source, 0, 0, 0, 0, $w, $h);

        return $image;
    }

    /** Mỗi điểm ảnh một số nguyên ARGB (A 0..255, 255 = đục) — gọn bộ nhớ hơn mảng 4 phần tử. */
    private function readPixels(GdImage $image, int $w, int $h): array
    {
        $pixels = [];
        for ($y = 0; $y < $h; $y++) {
            for ($x = 0; $x < $w; $x++) {
                $pixels[] = $this->argb(imagecolorat($image, $x, $y));
            }
        }

        return $pixels;
    }

    /** Màu GD (alpha 0 = đục … 127 = trong suốt) → ARGB với A 0..255. */
    private function argb(int $gd): int
    {
        $alpha = 255 - (int) round((($gd >> 24) & 0x7F) * 255 / 127);

        return ($alpha << 24) | ($gd & 0xFFFFFF);
    }

    /* ------------------------------------------------------------------ Nền ca-rô giả */

    /**
     * Ca-rô = hàng trên cùng và cột trái là 2 màu sáng gần như không màu xen kẽ thành ô đều nhau.
     *
     * @return array{cell: int, offX: int, offY: int, light: int, dark: int}|null
     */
    private function detectChecker(GdImage $source): ?array
    {
        $w = imagesx($source);
        $h = imagesy($source);
        $row = [];
        $col = [];
        for ($x = 0; $x < $w; $x++) {
            $row[] = $this->argb(imagecolorat($source, $x, 0));
        }
        for ($y = 0; $y < $h; $y++) {
            $col[] = $this->argb(imagecolorat($source, 0, $y));
        }
        $rowRuns = $this->twoToneRuns($row);
        $colRuns = $this->twoToneRuns($col);
        if ($rowRuns === null || $colRuns === null || abs($rowRuns['cell'] - $colRuns['cell']) > 1) {
            return null;
        }
        $cell = $rowRuns['cell'];
        $offX = ($cell - $rowRuns['firstBoundary'] % $cell) % $cell;
        $offY = ($cell - $colRuns['firstBoundary'] % $cell) % $cell;
        // Ô chứa điểm (0,0) là ô chẵn (offX, offY < cell); xác định nó sáng hay tối.
        [$light, $dark] = $this->near($row[0], $rowRuns['light'], 10)
            ? [$rowRuns['light'], $rowRuns['dark']]
            : [$rowRuns['dark'], $rowRuns['light']];

        // light/dark ở đây nghĩa là màu của ô chẵn / ô lẻ.
        return ['cell' => $cell, 'offX' => $offX, 'offY' => $offY, 'light' => $light, 'dark' => $dark];
    }

    /** @return array{cell: int, firstBoundary: int, light: int, dark: int}|null */
    private function twoToneRuns(array $line): ?array
    {
        $isGrey = function (int $p): bool {
            [$r, $g, $b, $a] = $this->rgba($p);
            $min = min($r, $g, $b);

            return $a >= 250 && $min >= 180 && max($r, $g, $b) - $min <= 10;
        };
        $greys = array_values(array_filter($line, $isGrey));
        if ($greys === []) {
            return null;
        }
        // Màu ô sáng = điểm xám/trắng sáng nhất; màu ô tối = TRUNG BÌNH các điểm xám tối hơn rõ rệt (≥ 8)
        // (lấy trung bình để nhiễu JPEG của một điểm không làm lệch màu ô).
        $lightness = fn (int $p) => min(($p >> 16) & 0xFF, ($p >> 8) & 0xFF, $p & 0xFF);
        $light = array_reduce($greys, fn (?int $best, int $p) => $best === null || $lightness($p) > $lightness($best) ? $p : $best);
        $darks = array_values(array_filter($greys, fn (int $p) => $lightness($light) - $lightness($p) >= 8));
        if ($darks === []) {
            return null;
        }
        $avg = fn (int $shift) => (int) round(array_sum(array_map(fn (int $p) => ($p >> $shift) & 0xFF, $darks)) / count($darks));
        $dark = (0xFF << 24) | ($avg(16) << 16) | ($avg(8) << 8) | $avg(0);

        // Đổi đường quét thành các đoạn L/D/x rồi đo độ dài.
        $runs = [];
        $current = null;
        $length = 0;
        foreach ($line as $p) {
            $tone = $this->near($p, $light, 8) ? 'L' : ($this->near($p, $dark, 8) ? 'D' : 'x');
            if ($tone === $current) {
                $length++;

                continue;
            }
            if ($current !== null) {
                $runs[] = [$current, $length];
            }
            $current = $tone;
            $length = 1;
        }
        $runs[] = [$current, $length];

        // Cần ≥ 3 đoạn L/D đầy đủ (bỏ đoạn đầu, cuối có thể bị cắt), dài gần bằng nhau, không lẫn màu khác.
        $inner = array_slice($runs, 1, -1);
        if (count($inner) < 3 || in_array('x', array_column($inner, 0), true)) {
            return null;
        }
        $lengths = array_column($inner, 1);
        $cell = (int) round(array_sum($lengths) / count($lengths));
        if ($cell < 4 || $cell > 80 || max($lengths) - min($lengths) > 2) {
            return null;
        }

        return ['cell' => $cell, 'firstBoundary' => $runs[0][1], 'light' => $light, 'dark' => $dark];
    }

    private function checkerMask(array $pixels, int $w, int $h, array $checker): string
    {
        $n = $w * $h;
        ['cell' => $cell, 'offX' => $offX, 'offY' => $offY, 'light' => $even, 'dark' => $odd] = $checker;
        $matches = function (int $i) use ($pixels, $w, $cell, $offX, $offY, $even, $odd): bool {
            $p = $pixels[$i];
            if ((($p >> 24) & 0xFF) < 20) {
                return true;
            }
            $parity = (intdiv($i % $w + $offX, $cell) + intdiv(intdiv($i, $w) + $offY, $cell)) % 2;

            return $this->near($p, $parity === 0 ? $even : $odd, 10);
        };

        // Vùng ca-rô chạm mép + vùng ca-rô bị bao kín đủ lớn (lỗ trong chữ / vòng) là nền.
        $mask = str_repeat('0', $n);
        $seen = str_repeat('0', $n);
        $minHole = max(60, (int) ($n * 0.0006));
        for ($s = 0; $s < $n; $s++) {
            if ($seen[$s] === '1' || ! $matches($s)) {
                continue;
            }
            [$region, $touchesEdge] = $this->collect($seen, $s, $w, $h, $matches);
            if ($touchesEdge || count($region) >= $minHole) {
                foreach ($region as $i) {
                    $mask[$i] = '1';
                }
            }
        }

        // Đốm lẻ còn sót ở ranh giới ô (không nối với logo) → nền.
        $seen = $mask;
        $maxSpeck = max(20, (int) ($n * 0.0002));
        for ($s = 0; $s < $n; $s++) {
            if ($seen[$s] === '1') {
                continue;
            }
            [$region] = $this->collect($seen, $s, $w, $h, fn (int $i) => $mask[$i] === '0');
            if (count($region) < $maxSpeck) {
                foreach ($region as $i) {
                    $mask[$i] = '1';
                }
            }
        }

        return $mask;
    }

    /* ------------------------------------------------------------------ Nền trong suốt / một màu */

    /** Chuỗi '1' = nền, '0' = logo (mỗi ký tự một điểm ảnh). */
    private function backgroundMask(array $pixels, int $w, int $h): string
    {
        $n = $w * $h;
        $border = $this->borderIndexes($w, $h);

        // Ảnh đã trong suốt: phần lớn mép là trong suốt → không xóa gì, chỉ cắt gọn.
        $transparent = count(array_filter($border, fn (int $i) => (($pixels[$i] >> 24) & 0xFF) < 20));
        if ($transparent >= count($border) * 0.5) {
            return str_repeat('0', $n);
        }

        // Nền một màu = màu chiếm đa số ở mép ảnh.
        $counts = [];
        foreach ($border as $i) {
            $p = $pixels[$i];
            $key = ((($p >> 19) & 31) << 10) | ((($p >> 11) & 31) << 5) | (($p >> 3) & 31);
            $counts[$key] = ($counts[$key] ?? 0) + 1;
        }
        arsort($counts);
        $top = (int) array_key_first($counts);
        $bg = (((($top >> 10) & 31) * 8 + 4) << 16) | (((($top >> 5) & 31) * 8 + 4) << 8) | (($top & 31) * 8 + 4);
        $similar = count(array_filter($border, fn (int $i) => $this->near($pixels[$i], $bg, 28)));
        if ($similar < count($border) * 0.6) {
            $this->fail('Nền ảnh phức tạp, không tách tự động được. Hãy dùng ảnh PNG nền trong suốt hoặc nền trắng.');
        }
        [$br, $bgG, $bb] = $this->rgba($bg);
        $lightBg = min($br, $bgG, $bb) >= 225;
        $isBg = function (int $i) use ($pixels, $bg, $lightBg): bool {
            $p = $pixels[$i];
            [$r, $g, $b, $a] = $this->rgba($p);
            if ($a < 20 || $this->near($p, $bg, 28)) {
                return true;
            }
            // Nền sáng: watermark xám nhạt gần như không màu cũng là nền.
            $min = min($r, $g, $b);

            return $lightBg && $min >= 175 && max($r, $g, $b) - $min <= 14;
        };

        $mask = str_repeat('0', $n);
        $this->flood($mask, $border, $w, $h, $isBg);

        return $mask;
    }

    /* ------------------------------------------------------------------ Áp nền & cắt gọn */

    private function applyMask(GdImage $image, array $pixels, string $mask, int $w, int $h): void
    {
        if (! str_contains($mask, '1')) {
            return;
        }
        $clear = imagecolorallocatealpha($image, 0, 0, 0, 127);
        for ($y = 0; $y < $h; $y++) {
            for ($x = 0; $x < $w; $x++) {
                $i = $y * $w + $x;
                if ($mask[$i] === '1') {
                    imagesetpixel($image, $x, $y, $clear);

                    continue;
                }
                // Viền giáp nền: bán trong suốt để không lộ răng cưa màu nền cũ.
                $edge = ($x > 0 && $mask[$i - 1] === '1') || ($x < $w - 1 && $mask[$i + 1] === '1')
                    || ($y > 0 && $mask[$i - $w] === '1') || ($y < $h - 1 && $mask[$i + $w] === '1');
                if ($edge) {
                    [$r, $g, $b, $a] = $this->rgba($pixels[$i]);
                    imagesetpixel($image, $x, $y, imagecolorallocatealpha($image, $r, $g, $b, 127 - (int) round(min($a, 170) * 127 / 255)));
                }
            }
        }
    }

    private function fitToSquare(GdImage $image, array $pixels, string $mask, int $w, int $h): string
    {
        $minX = $w;
        $minY = $h;
        $maxX = -1;
        $maxY = -1;
        for ($y = 0; $y < $h; $y++) {
            for ($x = 0; $x < $w; $x++) {
                $i = $y * $w + $x;
                if ($mask[$i] === '0' && (($pixels[$i] >> 24) & 0xFF) > 8) {
                    $minX = min($minX, $x);
                    $maxX = max($maxX, $x);
                    $minY = min($minY, $y);
                    $maxY = max($maxY, $y);
                }
            }
        }
        if ($maxX < 0) {
            $this->fail('Không tìm thấy logo trong ảnh (ảnh trống hoặc chỉ có nền).');
        }

        $cw = $maxX - $minX + 1;
        $ch = $maxY - $minY + 1;
        $box = self::SIZE - 2 * self::MARGIN;
        $scale = min($box / $cw, $box / $ch);
        $dw = max(1, (int) round($cw * $scale));
        $dh = max(1, (int) round($ch * $scale));

        $out = imagecreatetruecolor(self::SIZE, self::SIZE);
        imagealphablending($out, false);
        imagesavealpha($out, true);
        imagefill($out, 0, 0, imagecolorallocatealpha($out, 0, 0, 0, 127));
        imagecopyresampled($out, $image, intdiv(self::SIZE - $dw, 2), intdiv(self::SIZE - $dh, 2), $minX, $minY, $dw, $dh, $cw, $ch);

        ob_start();
        imagepng($out, null, 9);

        return (string) ob_get_clean();
    }

    /* ------------------------------------------------------------------ Tiện ích */

    /** @return array{0: int, 1: int, 2: int, 3: int} [r, g, b, a] */
    private function rgba(int $p): array
    {
        return [($p >> 16) & 0xFF, ($p >> 8) & 0xFF, $p & 0xFF, ($p >> 24) & 0xFF];
    }

    /** Hai màu gần nhau (từng kênh R, G, B lệch không quá $tolerance). */
    private function near(int $p, int $color, int $tolerance): bool
    {
        return abs((($p >> 16) & 0xFF) - (($color >> 16) & 0xFF)) <= $tolerance
            && abs((($p >> 8) & 0xFF) - (($color >> 8) & 0xFF)) <= $tolerance
            && abs(($p & 0xFF) - ($color & 0xFF)) <= $tolerance;
    }

    /** @return list<int> */
    private function borderIndexes(int $w, int $h): array
    {
        $indexes = [];
        for ($x = 0; $x < $w; $x++) {
            $indexes[] = $x;
            $indexes[] = ($h - 1) * $w + $x;
        }
        for ($y = 1; $y < $h - 1; $y++) {
            $indexes[] = $y * $w;
            $indexes[] = $y * $w + $w - 1;
        }

        return $indexes;
    }

    /** Loang từ các điểm mép thỏa điều kiện, đánh dấu '1' vào $mask. */
    private function flood(string &$mask, array $seeds, int $w, int $h, callable $accept): void
    {
        $stack = [];
        foreach ($seeds as $i) {
            if ($mask[$i] === '0' && $accept($i)) {
                $mask[$i] = '1';
                $stack[] = $i;
            }
        }
        while ($stack !== []) {
            $i = array_pop($stack);
            foreach ($this->neighbors($i, $w, $h) as $j) {
                if ($mask[$j] === '0' && $accept($j)) {
                    $mask[$j] = '1';
                    $stack[] = $j;
                }
            }
        }
    }

    /**
     * Gom một vùng liên thông bắt đầu từ $start (đánh dấu vào $seen).
     *
     * @return array{0: list<int>, 1: bool} [các điểm, có chạm mép ảnh]
     */
    private function collect(string &$seen, int $start, int $w, int $h, callable $accept): array
    {
        $region = [];
        $touches = false;
        $stack = [$start];
        $seen[$start] = '1';
        while ($stack !== []) {
            $i = array_pop($stack);
            $region[] = $i;
            $x = $i % $w;
            $y = intdiv($i, $w);
            if ($x === 0 || $y === 0 || $x === $w - 1 || $y === $h - 1) {
                $touches = true;
            }
            foreach ($this->neighbors($i, $w, $h) as $j) {
                if ($seen[$j] === '0' && $accept($j)) {
                    $seen[$j] = '1';
                    $stack[] = $j;
                }
            }
        }

        return [$region, $touches];
    }

    /** @return list<int> */
    private function neighbors(int $i, int $w, int $h): array
    {
        $x = $i % $w;
        $result = [];
        if ($x > 0) {
            $result[] = $i - 1;
        }
        if ($x < $w - 1) {
            $result[] = $i + 1;
        }
        if ($i >= $w) {
            $result[] = $i - $w;
        }
        if ($i < ($h - 1) * $w) {
            $result[] = $i + $w;
        }

        return $result;
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['logo_url' => $message]);
    }
}
