import { useEffect,useMemo,useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchApi } from '../../services/api';
import { ReferenceBanner,ReferenceBottomStrip } from './ReferenceShell';

type Service = {id:number;name:string;description?:string|null;category?:string|null;base_price?:number|string|null;estimated_price?:number|string|null};
const money=(n:number|string|null|undefined)=> n==null || n==='' || !Number.isFinite(Number(n)) ? 'Liên hệ tư vấn' : 'Từ '+new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(Number(n));
function photo(service:Pick<Service,'name'|'category'>){
 const text=`${service.name} ${service.category??''}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
 if(['dau','oil','bao duong','maintenance'].some(keyword=>text.includes(keyword)))return '1';
 if(['phanh','brake'].some(keyword=>text.includes(keyword)))return '3';
 if(['lop','tire','wheel'].some(keyword=>text.includes(keyword)))return '4';
 if(['ac quy','battery','binh dien'].some(keyword=>text.includes(keyword)))return '6';
 if(['dieu hoa','may lanh','dien lanh','air conditioning'].some(keyword=>text.includes(keyword)))return '5';
 return '2';
}
export default function ReferenceServices(){
 const [searchParams,setSearchParams] = useSearchParams();
 const [items,setItems]=useState<Service[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [retry,setRetry]=useState(0);
 const [query,setQuery]=useState(()=>searchParams.get('search')||'');const [category,setCategory]=useState('Tất cả dịch vụ');
 useEffect(()=>{setQuery(searchParams.get('search')||'')},[searchParams]);
 useEffect(()=>{let alive=true;setLoading(true);setError('');fetchApi<Service[]|{data:Service[]}>('/services').then(r=>{if(alive)setItems(Array.isArray(r)?r:Array.isArray(r?.data)?r.data:[])}).catch(e=>{if(alive)setError(e instanceof Error?e.message:'Không tải được danh mục dịch vụ')}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[retry]);
 const categories=useMemo(()=>['Tất cả dịch vụ',...new Set(items.map(i=>i.category).filter((v):v is string=>!!v))],[items]);
 const filtered=useMemo(()=>items.filter(i=>(category==='Tất cả dịch vụ'||i.category===category)&&(i.name+' '+(i.description||'')).toLowerCase().includes(query.toLowerCase().trim())),[items,category,query]);
 return <main className="v3ref"><ReferenceBanner title="Dịch vụ của chúng tôi" subtitle="Đa dạng dịch vụ chăm sóc, bảo dưỡng và sửa chữa ô tô theo nhu cầu thực tế."/>
 <div className="v3ref-featurebar">{[['♢','Kỹ thuật viên chuyên nghiệp','Quy trình rõ ràng'],['⚙','Trang thiết bị hiện đại','Kiểm tra, chẩn đoán chính xác'],['☆','Phụ tùng phù hợp','Đối chiếu theo xe và tồn kho'],['♧','Dịch vụ minh bạch','Có báo giá để khách phê duyệt']].map(([icon,t,d])=><div key={t}><span>{icon}</span><p><strong>{t}</strong><small>{d}</small></p></div>)}</div>
 <div className="v3ref-container v3ref-two-col"><aside className="v3ref-filter-sidebar"><h3>▦ &nbsp; Danh mục dịch vụ</h3>{categories.map((c,i)=><button key={c} className={c===category?'active':''} onClick={()=>setCategory(c)}><span>{i===0?'▦':'⚙'}</span>{c}</button>)}</aside>
 <section className="v3ref-list-content"><div className="v3ref-section-head v3ref-list-head"><h2>{category}</h2><input aria-label="Tìm dịch vụ" placeholder="⌕   Tìm kiếm dịch vụ (ví dụ: thay dầu, bảo dưỡng...)" value={query} onChange={e=>{const next=e.target.value;setQuery(next);setSearchParams(prev=>{const copy=new URLSearchParams(prev);if(next.trim())copy.set('search',next);else copy.delete('search');return copy},{replace:true})}}/></div>
 {loading?<p className="v3ref-empty">Đang tải danh mục dịch vụ…</p>:error?<div className="v3ref-empty" role="alert">{error}<br/><button onClick={()=>setRetry(v=>v+1)}>Thử tải lại</button></div>:filtered.length===0?<p className="v3ref-empty">Chưa có dịch vụ phù hợp trong dữ liệu gara.</p>:<div className="v3ref-service-grid">{filtered.map(service=><article className="v3ref-service-card" key={service.id}><div className="v3ref-card-photo"><img src={`/showcase/service-${photo(service)}.webp`} alt={`Ảnh minh họa dịch vụ ${service.name}`} loading="lazy" decoding="async"/></div><div className="v3ref-card-body"><h3>{service.name}</h3><p>{service.description||'Tư vấn và thực hiện theo tình trạng thực tế của xe.'}</p><div className="v3ref-card-bottom"><strong>{money(service.base_price??service.estimated_price)}</strong><Link to={`/booking?service=${service.id}`}>Đặt lịch →</Link></div></div></article>)}</div>}
 </section></div><div className="v3ref-container"><ReferenceBottomStrip title="Chưa chắc nên chọn dịch vụ nào?" subtitle="Hãy đặt lịch để cố vấn kiểm tra và đề xuất dịch vụ phù hợp với xe của bạn."/></div></main>;
}
