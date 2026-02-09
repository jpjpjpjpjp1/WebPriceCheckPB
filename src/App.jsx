import React, { useState, useEffect, useMemo } from 'react';
import { Search, Scan, X, Package, Tag, Calculator, ShoppingCart, Barcode, Sparkles } from 'lucide-react';

// --- จำลองข้อมูลสินค้า ---
const MOCK_DATA = [
  { sku: "PB001", barcode: "8851234567890", name: "ปากกาลูกลื่นสีน้ำเงิน 0.5mm", category_main: "เครื่องเขียน", category_sub: "ปากกา", cost: "5.00", price_retail: "7.00", price_credit: "6.50", unit: "ด้าม" },
  { sku: "PB002", barcode: "8859876543210", name: "สมุดโน้ต A5 มีเส้นปกแข็ง", category_main: "ผลิตภัณฑ์กระดาษ", category_sub: "สมุด", cost: "15.00", price_retail: "25.00", price_credit: "22.00", unit: "เล่ม" },
  { sku: "PB003", barcode: "8855555555555", name: "กาวน้ำใส 50ml ตราม้า", category_main: "อุปกรณ์สำนักงาน", category_sub: "กาว", cost: "8.00", price_retail: "15.00", price_credit: "12.00", unit: "ขวด" },
  { sku: "PB004", barcode: "8850000000001", name: "กระดาษ A4 80gsm (500 แผ่น)", category_main: "ผลิตภัณฑ์กระดาษ", category_sub: "กระดาษถ่ายเอกสาร", cost: "115.00", price_retail: "135.00", price_credit: "130.00", unit: "รีม" },
  { sku: "PB005", barcode: "8850000000002", name: "แฟ้มสันกว้าง 3 นิ้ว สีดำ", category_main: "อุปกรณ์จัดเก็บ", category_sub: "แฟ้ม", cost: "45.00", price_retail: "65.00", price_credit: "60.00", unit: "เล่ม" },
  { sku: "PB006", barcode: "8850000000003", name: "ดินสอ 2B กล่อง 12 แท่ง", category_main: "เครื่องเขียน", category_sub: "ดินสอ", cost: "30.00", price_retail: "45.00", price_credit: "40.00", unit: "กล่อง" },
];

// --- ALGORITHM: Smart Search / Fuzzy Logic ---
// ฟังก์ชันคำนวณระยะห่างระหว่างคำ (Levenshtein Distance) ใช้เดาคำผิด
const getEditDistance = (a, b) => {
  if (a.length === 0) return b.length; 
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
};

export default function App() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(true);

  // จำลองการโหลดข้อมูล
  useEffect(() => {
    setTimeout(() => {
      setProducts(MOCK_DATA);
      setLoading(false);
    }, 800);
  }, []);

  // --- ระบบค้นหาอัจฉริยะ (Smart Search Implementation) ---
  const searchResults = useMemo(() => {
    if (!query) return [];
    
    const cleanQuery = query.toLowerCase().trim();
    const queryTokens = cleanQuery.split(' ').filter(t => t.length > 0);
    
    // คำนวณคะแนนสินค้าแต่ละตัว
    const scoredProducts = products.map(item => {
      let score = 0;
      let matchType = null; // 'exact', 'partial', 'fuzzy'

      const itemText = `${item.name} ${item.category_main} ${item.category_sub}`.toLowerCase();
      
      // 1. ตรวจสอบ Barcode/SKU (ต้องแม่นยำสูงสุด)
      if (item.barcode.includes(cleanQuery) || item.sku.toLowerCase().includes(cleanQuery)) {
        score += 100;
        matchType = 'exact';
      }

      // 2. ตรวจสอบชื่อสินค้า (Keyword Matching)
      let foundTokens = 0;
      queryTokens.forEach(token => {
        if (itemText.includes(token)) {
          score += 10;
          foundTokens++;
        } else {
          // 3. ตรวจสอบคำใกล้เคียง (Fuzzy Match - พิมพ์ผิด)
          // อนุญาตให้ผิดได้ 1-2 ตัวอักษร ขึ้นอยู่กับความยาวคำ
          const threshold = token.length > 4 ? 2 : 1;
          // เช็คกับชื่อสินค้าแต่ละคำ
          const words = item.name.split(' ');
          const isClose = words.some(word => getEditDistance(word.toLowerCase(), token) <= threshold);
          if (isClose) {
            score += 5; // ได้คะแนนน้อยกว่าพิมพ์ถูก แต่ยังหาเจอ
            foundTokens++;
            matchType = matchType || 'fuzzy';
          }
        }
      });

      // Boost คะแนนถ้าเจอครบทุกคำที่พิมพ์
      if (foundTokens === queryTokens.length && queryTokens.length > 0) {
        score += 20;
      }

      return { ...item, score, matchType };
    });

    // กรองเอาเฉพาะที่มีคะแนน > 0 และเรียงลำดับคะแนนมากไปน้อย
    return scoredProducts
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score);

  }, [query, products]);

  const handleSimulateScan = () => {
    setQuery("8851234567890");
    setIsScanning(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* --- HEADER --- */}
      <header className="bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <ShoppingCart className="w-6 h-6" />
                ไพรบึงเครื่องเขียน
              </h1>
              <p className="text-xs text-red-100 opacity-90 pl-8">Prai Bueng Stationery Check</p>
            </div>
            
            <button 
              onClick={() => setIsScanning(!isScanning)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium shadow-md transition-all active:scale-95 ${
                isScanning 
                ? 'bg-white text-gray-800 hover:bg-gray-100' 
                : 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm'
              }`}
            >
              {isScanning ? <X size={20} /> : <Scan size={20} />}
              <span className="hidden sm:inline">{isScanning ? 'ปิดกล้อง' : 'สแกนสินค้า'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-3xl mx-auto px-4 mt-6">

        {/* SCANNER UI */}
        {isScanning && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-black rounded-2xl overflow-hidden shadow-2xl relative aspect-video sm:aspect-[21/9] flex flex-col items-center justify-center">
              <div className="absolute inset-0 border-2 border-white/30 rounded-lg m-8 animate-pulse"></div>
              <div className="w-full h-0.5 bg-red-500 absolute top-1/2 shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div>
              <p className="text-white/80 z-10 mb-4 bg-black/50 px-3 py-1 rounded-full text-sm">วางบาร์โค้ดให้อยู่ในกรอบ</p>
              <button 
                onClick={handleSimulateScan}
                className="z-10 bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition"
              >
                [จำลอง] พบสินค้า: ปากกา
              </button>
            </div>
          </div>
        )}

        {/* SEARCH BAR */}
        <div className="relative mb-6 group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            placeholder="ค้นหาชื่อ, บาร์โค้ด (เช่น 'ปากา', 'สมุด แดง')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* --- SMART SEARCH INDICATOR --- */}
        {/* แสดงข้อความเมื่อระบบช่วยเดาคำให้ */}
        {query && searchResults.length > 0 && searchResults[0].matchType === 'fuzzy' && (
          <div className="mb-4 px-4 py-2 bg-yellow-50 text-yellow-700 text-sm rounded-lg flex items-center gap-2 animate-pulse">
            <Sparkles size={16} />
            <span>แสดงผลลัพธ์ใกล้เคียงสำหรับ "{query}"</span>
          </div>
        )}

        {/* RESULT AREA */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-200 border-t-red-600 mb-3"></div>
            <p className="text-gray-500">กำลังโหลดฐานข้อมูล...</p>
          </div>
        ) : (
          <div className="space-y-4">
            
            {!query && !isScanning && (
              <div className="text-center py-16 opacity-60">
                <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calculator size={40} className="text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-600">ระบบค้นหาอัจฉริยะพร้อมใช้งาน</h3>
                <p className="text-gray-400 text-sm mt-1">รองรับการค้นหาด้วยชื่อสินค้า บาร์โค้ด หรือคำใกล้เคียง</p>
              </div>
            )}

            {query && searchResults.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                <Package size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-800 font-medium">ไม่พบสินค้าใกล้เคียง "{query}"</p>
                <p className="text-gray-500 text-sm mt-1">ลองตรวจสอบใหม่ หรือเพิ่มสินค้าเข้าระบบ</p>
              </div>
            )}

            {searchResults.map((item, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                          {item.category_main}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-100">
                          {item.category_sub}
                        </span>
                        {/* แสดงป้ายบอกว่ารายการนี้เป็น Fuzzy Match หรือไม่ */}
                        {item.matchType === 'fuzzy' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                            <Sparkles size={10} className="mr-1"/> ใกล้เคียง
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-gray-800 leading-snug">{item.name}</h2>
                    </div>
                    
                    <div className="flex flex-row sm:flex-col items-baseline sm:items-end justify-between sm:justify-start gap-2 bg-red-50/50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                      <div className="text-right">
                        <span className="text-sm text-gray-500 mr-2 sm:mr-0 sm:block">ราคาหน้าร้าน</span>
                        <span className="text-3xl font-bold text-red-600">฿{item.price_retail}</span>
                      </div>
                      <div className="text-sm text-gray-500 font-medium bg-white sm:bg-transparent px-2 sm:px-0 rounded">
                        ต่อ {item.unit}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50/80 px-5 py-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Tag size={12}/> SKU
                      </p>
                      <p className="font-mono font-medium text-gray-700">{item.sku}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Barcode size={12}/> Barcode
                      </p>
                      <p className="font-mono font-medium text-gray-700 tracking-wide">{item.barcode}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-200/60 grid grid-cols-2 gap-4">
                    <div className="bg-white p-2 rounded border border-gray-200">
                       <p className="text-xs text-gray-400 mb-0.5">ต้นทุน (Cost)</p>
                       <p className="font-bold text-gray-600">฿{item.cost}</p>
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-200">
                       <p className="text-xs text-orange-500 mb-0.5">ราคาเครดิต</p>
                       <p className="font-bold text-orange-600">฿{item.price_credit}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-gray-200 py-2 px-4 text-center text-xs text-gray-400 z-40">
        <p>ผลการค้นหา {searchResults.length} รายการ | โหมด: Intelligent Search</p>
      </footer>

    </div>
  );
}