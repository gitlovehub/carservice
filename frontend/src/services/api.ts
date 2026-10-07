import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

export const axiosInstance = axios.create({
    baseURL: 'http://localhost:8000',
    withCredentials: true,
});

// Thêm interceptor để tự động gắn token vào header (nếu đã đăng nhập)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export interface ServiceItem {
    id: number;
    name: string;
    category: string;
    base_price: number;
    estimated_duration_min?: number;
    description?: string;
    status?: string;
}

export interface MaintenancePackage {
    id: number;
    name: string;
    mileage_km: number;
    description?: string;
    price?: number;
    services: ServiceItem[];
    parts?: Array<{ id: number; name: string; quantity: number }>;
}

// CÁC HÀM NÀY BẠN ĐANG BỊ THIẾU NÊN NÓ BÁO LỖI:
export const getServices = async (params?: { category?: string; search?: string }) => {
    const res = await api.get('/services', { params });
    return res.data;
};

export const getServiceDetail = async (id: number) => {
    const res = await api.get(`/services/${id}`);
    return res.data;
};

export const getMaintenancePackages = async (model_id?: number) => {
    const res = await api.get('/maintenance-packages', { params: { model_id } });
    return res.data;
};

export const getPackageDetail = async (id: number) => {
    const res = await api.get(`/maintenance-packages/${id}`);
    return res.data;
};

export default api;