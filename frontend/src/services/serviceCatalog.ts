export type ServiceProduct = {
  id: string;
  title: string;
  description: string;
  price: string;
  backendServiceName: string;
  icon: string;
  iconColor: string;
  time?: string;
};

export const SERVICE_PRODUCTS: ServiceProduct[] = [
  {
    id: "std-maintenance",
    title: "Báº£o dÆ°á»¡ng Ä‘á»‹nh ká»³",
    description:
      "Kiá»ƒm tra vÃ  báº£o dÆ°á»¡ng xe theo Ä‘á»‹nh ká»³ Ä‘á»ƒ xe luÃ´n hoáº¡t Ä‘á»™ng á»•n Ä‘á»‹nh.",
    price: "Tá»« 500.000Ä‘",
    backendServiceName: "Báº£o dÆ°á»¡ng Ä‘á»‹nh ká»³",
    icon: "fa-solid fa-wrench",
    iconColor: "text-blue-600",
  },
  {
    id: "oil-filter",
    title: "Thay dáº§u Ä‘á»™ng cÆ¡",
    description:
      "Thay dáº§u Ä‘á»™ng cÆ¡ vÃ  kiá»ƒm tra cÃ¡c bá»™ pháº­n liÃªn quan Ä‘áº¿n há»‡ thá»‘ng bÃ´i trÆ¡n.",
    price: "Tá»« 350.000Ä‘",
    backendServiceName: "Thay dáº§u Ä‘á»™ng cÆ¡",
    icon: "fa-solid fa-oil-can",
    iconColor: "text-amber-500",
  },
  {
    id: "brake-check",
    title: "Kiá»ƒm tra phanh",
    description:
      "Kiá»ƒm tra mÃ¡ phanh, Ä‘Ä©a phanh vÃ  há»‡ thá»‘ng phanh Ä‘á»ƒ Ä‘áº£m báº£o an toÃ n.",
    price: "Tá»« 300.000Ä‘",
    backendServiceName: "Kiá»ƒm tra tá»•ng quÃ¡t",
    icon: "fa-solid fa-car-burst",
    iconColor: "text-red-500",
  },
  {
    id: "air-conditioning-check",
    title: "Kiá»ƒm tra Ä‘iá»u hÃ²a",
    description:
      "Kiá»ƒm tra há»‡ thá»‘ng Ä‘iá»u hÃ²a vÃ  xá»­ lÃ½ cÃ¡c váº¥n Ä‘á» vá» lÃ m mÃ¡t trong xe.",
    price: "Tá»« 400.000Ä‘",
    backendServiceName: "Kiá»ƒm tra tá»•ng quÃ¡t",
    icon: "fa-solid fa-snowflake",
    iconColor: "text-cyan-500",
  },
  {
    id: "engine-check",
    title: "Kiá»ƒm tra Ä‘á»™ng cÆ¡",
    description:
      "Kiá»ƒm tra tá»•ng quÃ¡t Ä‘á»™ng cÆ¡ vÃ  phÃ¡t hiá»‡n cÃ¡c váº¥n Ä‘á» cáº§n sá»­a chá»¯a.",
    price: "Tá»« 600.000Ä‘",
    backendServiceName: "Kiá»ƒm tra tá»•ng quÃ¡t",
    icon: "fa-solid fa-engine",
    iconColor: "text-emerald-600",
  },
  {
    id: "detailing-spa",
    title: "ChÄƒm sÃ³c xe",
    description:
      "Vá»‡ sinh vÃ  chÄƒm sÃ³c tá»•ng thá»ƒ giÃºp xe sáº¡ch sáº½ vÃ  giá»¯ Ä‘Æ°á»£c tÃ¬nh tráº¡ng tá»‘t.",
    price: "Tá»« 300.000Ä‘",
    backendServiceName: "Kiá»ƒm tra tá»•ng quÃ¡t",
    icon: "fa-solid fa-spray-can-sparkles",
    iconColor: "text-purple-500",
  },
];
