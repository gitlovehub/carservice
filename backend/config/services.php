<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'gemini' => [
        'key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-flash-lite-latest'),
    ],

    'chatbot' => [
        'phone' => env('CHATBOT_PHONE', '0332 405 972'),
        'email' => env('CHATBOT_EMAIL', 'contact@carservice.vn'),
    ],

    /*
    |--------------------------------------------------------------------------
    | VNPay
    |--------------------------------------------------------------------------
    |
    | Mọi giá trị bí mật (tmn_code, hash_secret) chỉ đọc từ .env của Backend.
    | Không đưa vào Frontend, không commit vào Git, không ghi ra log.
    | IPN URL KHÔNG khai báo ở đây: nó được đăng ký trên cổng merchant VNPay.
    |
    */

    'vnpay' => [
        'tmn_code' => env('VNPAY_TMN_CODE'),
        'hash_secret' => env('VNPAY_HASH_SECRET'),
        'payment_url' => env('VNPAY_PAYMENT_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
        'api_url' => env('VNPAY_API_URL', 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction'),
        'return_url' => env('VNPAY_RETURN_URL'),
        'ipn_url' => env('VNPAY_IPN_URL'),
        'version' => env('VNPAY_VERSION', '2.1.0'),
        'locale' => env('VNPAY_LOCALE', 'vn'),
        'order_type' => env('VNPAY_ORDER_TYPE', 'other'),
        'expire_minutes' => (int) env('VNPAY_EXPIRE_MINUTES', 15),
        'min_amount' => (int) env('VNPAY_MIN_AMOUNT', 5000),
        'max_amount' => (int) env('VNPAY_MAX_AMOUNT', 9999999999),
        'confirm_on_return' => (bool) env('VNPAY_CONFIRM_ON_RETURN', false),
        'query_on_return' => (bool) env('VNPAY_QUERY_ON_RETURN', false),
        'log_channel' => env('VNPAY_LOG_CHANNEL', 'vnpay'),
    ],

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];