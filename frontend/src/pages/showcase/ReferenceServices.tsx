import { useEffect,useMemo,useRef,useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchApi } from '../../services/api';
import { bookingLinkFor, useServicePicks } from '../../services/servicePicks';
import { ReferenceBanner,ReferenceBottomStrip } from './ReferenceShell';
import ServicePicksBar from './ServicePicksBar';
import { byPopularity, foldVi, money, serviceImage, type Service } from './serviceDisplay';

/** Ảnh dịch vụ do admin tải lên; chưa có (hoặc ảnh lỗi) → khung xám "Chưa có ảnh", không dùng ảnh minh họa cố định. */
function ServicePhoto({ service }: { service: Service }) {
  const src = serviceImage(service);
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className="v3ref-card-photo is-empty" aria-label="Dịch vụ chưa có ảnh"><span>Chưa có ảnh</span></div>;
  return <div className="v3ref-card-photo"><img src={src} alt={`Ảnh dịch vụ ${service.name}`} loading="lazy" decoding="async" onError={() => setFailed(true)}/></div>;
}
import { MaintenancePackageSlider } from './HomeSections';
import { useApi } from './publicData';
import { Icon, type IconName } from '../../components/ui/Icon';
import { userErrorMessage } from '../../services/apiError';

const PAGE_SIZE=6;
const ALL='Tất cả dịch vụ';
/** Khoảng giá (theo giá "Từ" của dịch vụ). */
const PRICE_RANGES:{value:string;label:string;min?:number;max?:number}[]=[
 {value:'',label:'Tất cả'},
 {value:'lt300',label:'Dưới 300.000₫',max:300000},
 {value:'300-500',label:'300.000₫ – 500.000₫',min:300000,max:500000},
 {value:'500-1000',label:'500.000₫ – 1.000.000₫',min:500000,max:1000000},
 {value:'gt1000',label:'Trên 1.000.000₫',min:1000000},
];
const SORTS:{value:string;label:string}[]=[
 {value:'',label:'Phổ biến'},{value:'newest',label:'Mới nhất'},{value:'price_asc',label:'Giá thấp → cao'},{value:'price_desc',label:'Giá cao → thấp'},
];
const fIco={viewBox:'0 0 24 24',width:26,height:26,fill:'none',stroke:'currentColor',strokeWidth:1.9,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true};
/** 4 điểm mạnh dưới banner — icon SVG nét mảnh cùng bộ. */
const FEATURES=[
 {title:'Kỹ thuật viên chuyên nghiệp',desc:'Quy trình rõ ràng',icon:<svg {...fIco}><circle cx="9" cy="7" r="3.5"/><path d="M3 20v-1.5A5.5 5.5 0 0 1 8.5 13h1"/><path d="M20.5 13.5a2.8 2.8 0 0 1-3.6 3.6l-3 3a1.3 1.3 0 0 1-1.9-1.9l3-3a2.8 2.8 0 0 1 3.6-3.6l-1.7 1.7.4 1.5 1.5.4Z"/></svg>},
 {title:'Trang thiết bị hiện đại',desc:'Kiểm tra, chẩn đoán chính xác',icon:<svg {...fIco}><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><path d="M6.5 11h2l1.5-3 2 5 1.5-2h4"/></svg>},
 {title:'Phụ tùng phù hợp',desc:'Đối chiếu theo xe và tồn kho',icon:<svg {...fIco}><path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>},
 {title:'Dịch vụ minh bạch',desc:'Có báo giá để khách phê duyệt',icon:<svg {...fIco}><path d="M6 3h9l4 4v14H6Z"/><path d="M14 3v5h5"/><path d="m9.5 14 2 2 4-4"/></svg>},
];
const priceOf=(s:Service)=>{const n=Number(s.base_price??s.estimated_price);return Number.isFinite(n)&&n>0?n:null};
const time=(s:Service)=>s.created_at?new Date(s.created_at).getTime():0;

export default function ReferenceServices(){
 const [searchParams,setSearchParams] = useSearchParams();
 const [items,setItems]=useState<Service[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [retry,setRetry]=useState(0);
 const listTop=useRef<HTMLDivElement>(null);
 // Bộ lọc đọc thẳng từ URL (?search, category, price, sort, page) — URL là nguồn duy nhất, gửi link vẫn giữ nguyên lựa chọn.
 const query=searchParams.get('search')||'';const category=searchParams.get('category')||ALL;
 const price=searchParams.get('price')||'';const sort=searchParams.get('sort')||'';
 // Đổi bộ lọc → về trang 1.
 const setParam=(key:string,value:string,empty:string)=>setSearchParams(prev=>{const copy=new URLSearchParams(prev);if(value.trim()===''||value===empty)copy.delete(key);else copy.set(key,value);if(key!=='page')copy.delete('page');return copy},{replace:true});
 const setCategory=(next:string)=>setParam('category',next,ALL);
 // Ô tìm kiếm giữ chữ đang gõ tại chỗ (bộ gõ tiếng Việt cần ghép phím), 300ms sau khi ngừng gõ mới ghi lên URL.
 // URL đổi từ nơi khác (Xoá bộ lọc, quay lại trang) thì ô nhập cập nhật theo.
 const [draft,setDraft]=useState(query);const [syncedQuery,setSyncedQuery]=useState(query);
 if(query!==syncedQuery){setSyncedQuery(query);if(query!==draft.trim())setDraft(query);}
 useEffect(()=>{
  const next=draft.trim();
  if(next===query)return;
  const timer=window.setTimeout(()=>setSearchParams(prev=>{const copy=new URLSearchParams(prev);if(next)copy.set('search',next);else copy.delete('search');copy.delete('page');return copy},{replace:true}),300);
  return()=>window.clearTimeout(timer);
 },[draft,query,setSearchParams]);
 useEffect(()=>{let alive=true;fetchApi<Service[]|{data:Service[]}>('/services').then(r=>{if(alive)setItems(Array.isArray(r)?r:Array.isArray(r?.data)?r.data:[])}).catch(e=>{if(alive)setError(userErrorMessage(e, 'Không tải được danh mục dịch vụ'))}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[retry]);
 // Danh mục + icon do admin chọn (/service-categories, theo thứ tự admin). Lỗi API → suy từ danh sách dịch vụ, icon mặc định.
 const apiCategories=useApi<{data:{id:number;name:string;icon:string;services_count:number}[]}>('/service-categories')?.data;
 const categories=useMemo(()=>{
  const list=apiCategories&&apiCategories.length>0
   ?apiCategories.map(c=>({name:c.name,icon:c.icon as IconName,count:c.services_count}))
   :[...new Set(items.map(i=>i.category).filter((v):v is string=>!!v))].map(name=>({name,icon:'wrench' as IconName,count:items.filter(i=>i.category===name).length}));
  return [{name:ALL,icon:'layers' as IconName,count:items.length},...list];
 },[apiCategories,items]);
 const filtered=useMemo(()=>{
  const range=PRICE_RANGES.find(r=>r.value===price);const term=foldVi(query);
  // Tìm không cần dấu: "loc" khớp "Lọc", "thay dau" khớp "Thay dầu" (so trên tên, mô tả, danh mục).
  const list=items.filter(i=>(category===ALL||i.category===category)&&foldVi(`${i.name} ${i.description||''} ${i.category||''}`).includes(term)&&(!range||!range.value||(()=>{const p=priceOf(i);return p!==null&&(range.min===undefined||p>=range.min)&&(range.max===undefined||p<range.max)})()));
  // Dịch vụ chưa có giá luôn xếp cuối khi sắp theo giá.
  const byPrice=(dir:number)=>(a:Service,b:Service)=>{const pa=priceOf(a),pb=priceOf(b);if(pa===null)return pb===null?0:1;if(pb===null)return -1;return (pa-pb)*dir};
  const sorted=[...list];
  if(sort==='price_asc')sorted.sort(byPrice(1));
  else if(sort==='price_desc')sorted.sort(byPrice(-1));
  else if(sort==='newest')sorted.sort((a,b)=>time(b)-time(a)||b.id-a.id);
  else sorted.sort(byPopularity); // "Phổ biến" (mặc định): theo số lần thực hiện thật — CL-01
  return sorted;
 },[items,category,query,price,sort]);
 const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
 const page=Math.min(Math.max(1,Number(searchParams.get('page'))||1),pages);
 const shown=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
 const goPage=(p:number)=>{setParam('page',p===1?'':String(p),'');listTop.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})};
 const filtersOn=query!==''||price!==''||sort!=='';
 // Dịch vụ đã chọn — dùng chung kho lựa chọn với trang chi tiết nhóm dịch vụ.
 const [picks,setPicks]=useServicePicks();
 const toggle=(id:number)=>setPicks(current=>({...current,ids:current.ids.includes(id)?current.ids.filter(x=>x!==id):[...current.ids,id]}));
 return <main className="v3ref"><ReferenceBanner title="Dịch vụ của" highlight="CarService" subtitle="Đa dạng dịch vụ chăm sóc, bảo dưỡng và sửa chữa ô tô theo tình trạng thực tế của xe — báo giá rõ ràng trước khi làm." image="banner-services.webp" position="right center"/>
 <div className="v3ref-featurebar">{FEATURES.map(f=><div key={f.title}><span className="v3ref-featurebar-icon">{f.icon}</span><p><strong>{f.title}</strong><small>{f.desc}</small></p></div>)}</div>
 <div className="v3ref-container"><MaintenancePackageSlider/></div>
 {/* Tiêu đề + ô tìm kiếm: 1 hàng riêng rộng hết khung, giống tiêu đề "Gói bảo dưỡng" phía trên. */}
 <div className="v3ref-container v3ref-sv-head" ref={listTop}>
  <div className="v3ref-section-head v3ref-list-head"><h2>{category}</h2>
   <label className="v3ref-sv-search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <input type="search" aria-label="Tìm dịch vụ" placeholder="Tìm kiếm dịch vụ (ví dụ: thay dầu, bảo dưỡng...)" value={draft} onChange={e=>setDraft(e.target.value)}/></label>
  </div>
 </div>
 <div className="v3ref-container v3ref-two-col"><aside className="v3ref-filter-sidebar" aria-label="Danh mục dịch vụ">{categories.map(c=><button key={c.name} className={c.name===category?'active':''} aria-pressed={c.name===category} onClick={()=>setCategory(c.name)}><span className="v3ref-sv-cat-icon"><Icon name={c.icon} size={15}/></span><span className="v3ref-sv-cat-name">{c.name}</span><small className="v3ref-sv-cat-count">{c.count}</small></button>)}</aside>
 <section className="v3ref-list-content">
  <div className="v3ref-sv-toolbar">
   <label><span>Khoảng giá</span><select value={price} onChange={e=>setParam('price',e.target.value,'')}>{PRICE_RANGES.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></label>
   <label><span>Sắp xếp</span><select value={sort} onChange={e=>setParam('sort',e.target.value,'')}>{SORTS.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
   {filtersOn&&<button type="button" className="v3ref-sv-clear" onClick={()=>setSearchParams(prev=>{const c=new URLSearchParams(prev);['search','price','sort','page'].forEach(k=>c.delete(k));return c},{replace:true})}>Xoá bộ lọc</button>}
   {!loading&&!error&&filtered.length>0&&<small className="v3ref-sv-count">Hiển thị {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,filtered.length)} / {filtered.length} dịch vụ</small>}
  </div>
 {loading?<p className="v3ref-empty">Đang tải danh mục dịch vụ…</p>:error?<div className="v3ref-empty" role="alert">{error}<br/><button onClick={()=>{setLoading(true);setError('');setRetry(v=>v+1)}}>Thử tải lại</button></div>:filtered.length===0?<p className="v3ref-empty">Không có dịch vụ phù hợp với bộ lọc.</p>:<div className="v3ref-service-grid">{shown.map(service=>{
  // Không còn ô tick (PO 18/11): bấm "Đặt lịch" để thêm dịch vụ vào lựa chọn rồi sang đặt lịch.
  const on=picks.ids.includes(service.id);
  return <article className={`v3ref-service-card ${on?'ring-2 ring-[#e11d2e]':''}`} key={service.id}><ServicePhoto service={service}/><div className="v3ref-card-body">
   <h3>{service.name}</h3>
   <p>{service.description||'Tư vấn và thực hiện theo tình trạng thực tế của xe.'}</p>
   <div className="v3ref-card-bottom"><strong>{money(service.base_price??service.estimated_price)}</strong>
    {/* Đặt lịch ngay dịch vụ này: thêm vào lựa chọn rồi sang đặt lịch cùng các dịch vụ đã chọn khác. */}
    <Link to={bookingLinkFor({...picks,ids:[...new Set([...picks.ids,service.id])]})} onClick={()=>{if(!on)toggle(service.id)}}>Đặt lịch →</Link></div>
  </div></article>;})}</div>}
 {!loading&&!error&&pages>1&&<nav className="v3ref-sv-pages" aria-label="Phân trang dịch vụ">
  <button type="button" onClick={()=>goPage(page-1)} disabled={page===1} aria-label="Trang trước">‹</button>
  {Array.from({length:pages},(_,k)=>k+1).map(p=><button type="button" key={p} className={p===page?'active':''} aria-current={p===page?'page':undefined} onClick={()=>goPage(p)}>{p}</button>)}
  <button type="button" onClick={()=>goPage(page+1)} disabled={page===pages} aria-label="Trang sau">›</button>
 </nav>}
 </section></div><div className={`v3ref-container ${picks.ids.length?'pb-24':''}`}><ReferenceBottomStrip title="Chưa chắc nên chọn dịch vụ nào?" subtitle="Hãy đặt lịch để cố vấn kiểm tra và đề xuất dịch vụ phù hợp với xe của bạn."/></div>
 <ServicePicksBar picks={picks} services={items} onClear={()=>setPicks(()=>({ids:[],symptom:''}))}/></main>;
}