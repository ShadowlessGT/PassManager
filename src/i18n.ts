import { useSyncExternalStore } from 'react';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', nativeName: 'English', name: 'Englisch' },
  { code: 'zh-Hans', nativeName: '简体中文', name: 'Chinesisch (vereinfacht)' },
  { code: 'hi', nativeName: 'हिन्दी', name: 'Hindi' },
  { code: 'es', nativeName: 'Español', name: 'Spanisch' },
  { code: 'ar', nativeName: 'العربية', name: 'Arabisch' },
  { code: 'fr', nativeName: 'Français', name: 'Französisch' },
  { code: 'bn', nativeName: 'বাংলা', name: 'Bengalisch' },
  { code: 'pt', nativeName: 'Português', name: 'Portugiesisch' },
  { code: 'id', nativeName: 'Bahasa Indonesia', name: 'Indonesisch' },
  { code: 'ur', nativeName: 'اردو', name: 'Urdu' },
  { code: 'ru', nativeName: 'Русский', name: 'Russisch' },
  { code: 'de', nativeName: 'Deutsch', name: 'Deutsch' },
  { code: 'ja', nativeName: '日本語', name: 'Japanisch' },
  { code: 'vi', nativeName: 'Tiếng Việt', name: 'Vietnamesisch' },
  { code: 'sw', nativeName: 'Kiswahili', name: 'Suaheli' },
  { code: 'tr', nativeName: 'Türkçe', name: 'Türkisch' },
  { code: 'ta', nativeName: 'தமிழ்', name: 'Tamil' },
  { code: 'ko', nativeName: '한국어', name: 'Koreanisch' },
  { code: 'fa', nativeName: 'فارسی', name: 'Persisch' },
  { code: 'th', nativeName: 'ไทย', name: 'Thailändisch' }
] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];
export type LanguagePreference = AppLanguage | 'system';
type TranslationKey =
  | 'nav.vault' | 'nav.favorites' | 'nav.categories' | 'nav.insights' | 'nav.settings'
  | 'ui.language' | 'ui.auto' | 'ui.languageHint' | 'ui.mode' | 'ui.modeHint'
  | 'ui.simple' | 'ui.expert' | 'ui.appearance' | 'ui.fontSize'
  | 'ui.system' | 'ui.light' | 'ui.dark'
  | 'vault.my' | 'vault.search' | 'vault.encrypted' | 'vault.lock' | 'vault.new' | 'vault.noResults'
  | 'auth.unlock' | 'auth.create' | 'common.save' | 'common.cancel'
  | 'common.password' | 'common.email' | 'common.username' | 'common.close' | 'common.name';

const KEYS: readonly TranslationKey[] = [
  'nav.vault', 'nav.favorites', 'nav.categories', 'nav.insights', 'nav.settings',
  'ui.language', 'ui.auto', 'ui.languageHint', 'ui.mode', 'ui.modeHint',
  'ui.simple', 'ui.expert', 'ui.appearance', 'ui.fontSize',
  'ui.system', 'ui.light', 'ui.dark',
  'vault.my', 'vault.search', 'vault.encrypted', 'vault.lock', 'vault.new', 'vault.noResults',
  'auth.unlock', 'auth.create', 'common.save', 'common.cancel',
  'common.password', 'common.email', 'common.username', 'common.close', 'common.name'
];

/** Core UI translations. Remaining components are being migrated incrementally;
 * missing strings visibly fall back to German rather than becoming blank.
 * Passwords, names, notes and other user content are NEVER passed through this catalog. */
const LINES: Record<AppLanguage, readonly string[]> = {
  de: [
    'Tresor','Favoriten','Kategorien','Übersicht','Einstellungen',
    'Sprache','Automatisch (Gerätesprache)','Die Sprache wird auf diesem Gerät gespeichert. Keine Tresordaten werden verändert.',
    'Bedienung','Wähle die passende Oberfläche.','Einfach','Experte','Darstellung','Schriftgröße',
    'System','Hell','Dunkel','Mein Tresor','Suchen','Verschlüsselt','Tresor sperren','Neuer Eintrag','Keine Treffer gefunden',
    'Tresor entsperren','Sicheren Tresor erstellen','Speichern','Abbrechen','Passwort','E-Mail','Benutzername','Schließen','Name'
  ],
  en: [
    'Vault','Favorites','Categories','Insights','Settings',
    'Language','Automatic (device language)','Your language is saved on this device. Vault data will not change.',
    'Interface','Choose how you want to use the app.','Simple','Expert','Appearance','Text size',
    'System','Light','Dark','My vault','Search','Encrypted','Lock vault','New entry','No results found',
    'Unlock vault','Create secure vault','Save','Cancel','Password','Email','Username','Close','Name'
  ],
  'zh-Hans': [
    '密码库','收藏','分类','概览','设置',
    '语言','自动（设备语言）','语言设置保存在此设备上，不会修改密码库数据。',
    '使用方式','选择适合您的界面。','简易','专家','外观','字体大小',
    '跟随系统','浅色','深色','我的密码库','搜索','已加密','锁定密码库','新建条目','未找到结果',
    '解锁密码库','创建安全密码库','保存','取消','密码','电子邮件','用户名','关闭','名称'
  ],
  hi: [
    'वॉल्ट','पसंदीदा','श्रेणियाँ','अवलोकन','सेटिंग्स',
    'भाषा','स्वचालित (डिवाइस की भाषा)','भाषा इस डिवाइस पर सहेजी जाती है। वॉल्ट डेटा नहीं बदलेगा।',
    'इंटरफ़ेस','अपने लिए उपयुक्त इंटरफ़ेस चुनें।','सरल','विशेषज्ञ','दिखावट','अक्षर आकार',
    'सिस्टम','हल्का','गहरा','मेरा वॉल्ट','खोजें','एन्क्रिप्टेड','वॉल्ट लॉक करें','नई प्रविष्टि','कोई परिणाम नहीं',
    'वॉल्ट अनलॉक करें','सुरक्षित वॉल्ट बनाएँ','सहेजें','रद्द करें','पासवर्ड','ईमेल','उपयोगकर्ता नाम','बंद करें','नाम'
  ],
  es: [
    'Bóveda','Favoritos','Categorías','Resumen','Ajustes',
    'Idioma','Automático (idioma del dispositivo)','El idioma se guarda en este dispositivo. Los datos de la bóveda no cambian.',
    'Interfaz','Elige la interfaz que prefieras.','Sencillo','Experto','Apariencia','Tamaño del texto',
    'Sistema','Claro','Oscuro','Mi bóveda','Buscar','Cifrado','Bloquear bóveda','Nueva entrada','No se encontraron resultados',
    'Desbloquear bóveda','Crear bóveda segura','Guardar','Cancelar','Contraseña','Correo electrónico','Nombre de usuario','Cerrar','Nombre'
  ],
  ar: [
    'الخزنة','المفضلة','الفئات','نظرة عامة','الإعدادات',
    'اللغة','تلقائي (لغة الجهاز)','يُحفظ اختيار اللغة على هذا الجهاز دون تغيير بيانات الخزنة.',
    'واجهة الاستخدام','اختر الواجهة المناسبة لك.','بسيط','متقدم','المظهر','حجم النص',
    'النظام','فاتح','داكن','خزنتي','بحث','مشفّر','قفل الخزنة','إدخال جديد','لا توجد نتائج',
    'فتح الخزنة','إنشاء خزنة آمنة','حفظ','إلغاء','كلمة المرور','البريد الإلكتروني','اسم المستخدم','إغلاق','الاسم'
  ],
  fr: [
    'Coffre','Favoris','Catégories','Vue d’ensemble','Paramètres',
    'Langue','Automatique (langue de l’appareil)','La langue est enregistrée sur cet appareil. Les données du coffre ne sont pas modifiées.',
    'Interface','Choisissez votre interface.','Simple','Expert','Apparence','Taille du texte',
    'Système','Clair','Sombre','Mon coffre','Rechercher','Chiffré','Verrouiller le coffre','Nouvelle entrée','Aucun résultat',
    'Déverrouiller le coffre','Créer un coffre sécurisé','Enregistrer','Annuler','Mot de passe','E-mail','Nom d’utilisateur','Fermer','Nom'
  ],
  bn: [
    'ভল্ট','পছন্দের','বিভাগ','সারসংক্ষেপ','সেটিংস',
    'ভাষা','স্বয়ংক্রিয় (ডিভাইসের ভাষা)','ভাষা এই ডিভাইসে সংরক্ষিত হয়। ভল্টের ডেটা বদলায় না।',
    'ইন্টারফেস','আপনার পছন্দের ইন্টারফেস বেছে নিন।','সহজ','বিশেষজ্ঞ','চেহারা','লেখার আকার',
    'সিস্টেম','হালকা','গাঢ়','আমার ভল্ট','খুঁজুন','এনক্রিপ্ট করা','ভল্ট লক করুন','নতুন এন্ট্রি','কোনো ফলাফল নেই',
    'ভল্ট খুলুন','সুরক্ষিত ভল্ট তৈরি করুন','সংরক্ষণ','বাতিল','পাসওয়ার্ড','ইমেইল','ব্যবহারকারীর নাম','বন্ধ করুন','নাম'
  ],
  pt: [
    'Cofre','Favoritos','Categorias','Visão geral','Definições',
    'Idioma','Automático (idioma do dispositivo)','O idioma é guardado neste dispositivo. Os dados do cofre não são alterados.',
    'Interface','Escolha a interface mais adequada.','Simples','Especialista','Aparência','Tamanho do texto',
    'Sistema','Claro','Escuro','O meu cofre','Pesquisar','Encriptado','Bloquear cofre','Nova entrada','Nenhum resultado',
    'Desbloquear cofre','Criar cofre seguro','Guardar','Cancelar','Palavra-passe','E-mail','Nome de utilizador','Fechar','Nome'
  ],
  id: [
    'Brankas','Favorit','Kategori','Ringkasan','Pengaturan',
    'Bahasa','Otomatis (bahasa perangkat)','Bahasa disimpan di perangkat ini. Data brankas tidak berubah.',
    'Antarmuka','Pilih tampilan yang sesuai.','Sederhana','Ahli','Tampilan','Ukuran teks',
    'Sistem','Terang','Gelap','Brankas saya','Cari','Terenkripsi','Kunci brankas','Entri baru','Tidak ada hasil',
    'Buka brankas','Buat brankas aman','Simpan','Batal','Kata sandi','Email','Nama pengguna','Tutup','Nama'
  ],
  ur: [
    'محفوظ خانہ','پسندیدہ','زمرے','جائزہ','ترتیبات',
    'زبان','خودکار (ڈیوائس کی زبان)','زبان اس ڈیوائس پر محفوظ ہوتی ہے۔ محفوظ خانے کا ڈیٹا نہیں بدلے گا۔',
    'انٹرفیس','اپنی پسند کا انٹرفیس منتخب کریں۔','سادہ','ماہر','ظاہری شکل','متن کا سائز',
    'سسٹم','روشن','تاریک','میرا محفوظ خانہ','تلاش','خفیہ کردہ','محفوظ خانہ بند کریں','نیا اندراج','کوئی نتیجہ نہیں',
    'محفوظ خانہ کھولیں','محفوظ خانہ بنائیں','محفوظ کریں','منسوخ','پاس ورڈ','ای میل','صارف نام','بند کریں','نام'
  ],
  ru: [
    'Хранилище','Избранное','Категории','Обзор','Настройки',
    'Язык','Автоматически (язык устройства)','Язык сохраняется на устройстве. Данные хранилища не изменяются.',
    'Интерфейс','Выберите удобный интерфейс.','Простой','Экспертный','Оформление','Размер текста',
    'Система','Светлая','Тёмная','Моё хранилище','Поиск','Зашифровано','Заблокировать','Новая запись','Ничего не найдено',
    'Разблокировать','Создать защищённое хранилище','Сохранить','Отмена','Пароль','Эл. почта','Имя пользователя','Закрыть','Имя'
  ],
  ja: [
    '保管庫','お気に入り','カテゴリ','概要','設定',
    '言語','自動（端末の言語）','言語設定はこの端末に保存され、保管庫のデータは変更されません。',
    '操作モード','使いやすい画面を選択してください。','かんたん','上級者','外観','文字サイズ',
    'システム','ライト','ダーク','マイ保管庫','検索','暗号化済み','保管庫をロック','新しい項目','結果がありません',
    '保管庫のロック解除','安全な保管庫を作成','保存','キャンセル','パスワード','メール','ユーザー名','閉じる','名前'
  ],
  vi: [
    'Kho mật khẩu','Yêu thích','Danh mục','Tổng quan','Cài đặt',
    'Ngôn ngữ','Tự động (ngôn ngữ thiết bị)','Ngôn ngữ được lưu trên thiết bị này. Dữ liệu kho không thay đổi.',
    'Giao diện','Chọn giao diện phù hợp.','Đơn giản','Nâng cao','Giao diện','Cỡ chữ',
    'Hệ thống','Sáng','Tối','Kho của tôi','Tìm kiếm','Đã mã hóa','Khóa kho','Mục mới','Không có kết quả',
    'Mở khóa kho','Tạo kho an toàn','Lưu','Hủy','Mật khẩu','Email','Tên người dùng','Đóng','Tên'
  ],
  sw: [
    'Hifadhi','Vipendwa','Makundi','Muhtasari','Mipangilio',
    'Lugha','Otomatiki (lugha ya kifaa)','Lugha inahifadhiwa kwenye kifaa hiki. Data ya hifadhi haibadiliki.',
    'Mwonekano','Chagua mwonekano unaokufaa.','Rahisi','Mtaalamu','Mwonekano','Ukubwa wa maandishi',
    'Mfumo','Angavu','Giza','Hifadhi yangu','Tafuta','Imesimbwa','Funga hifadhi','Ingizo jipya','Hakuna matokeo',
    'Fungua hifadhi','Unda hifadhi salama','Hifadhi','Ghairi','Nenosiri','Barua pepe','Jina la mtumiaji','Funga','Jina'
  ],
  tr: [
    'Kasa','Favoriler','Kategoriler','Genel bakış','Ayarlar',
    'Dil','Otomatik (cihaz dili)','Dil seçimi bu cihaza kaydedilir. Kasa verileri değişmez.',
    'Arayüz','Sana uygun arayüzü seç.','Basit','Uzman','Görünüm','Yazı boyutu',
    'Sistem','Açık','Koyu','Kasam','Ara','Şifreli','Kasayı kilitle','Yeni kayıt','Sonuç bulunamadı',
    'Kasayı aç','Güvenli kasa oluştur','Kaydet','İptal','Şifre','E-posta','Kullanıcı adı','Kapat','Ad'
  ],
  ta: [
    'பாதுகாப்பகம்','பிடித்தவை','வகைகள்','மேலோட்டம்','அமைப்புகள்',
    'மொழி','தானாக (சாதன மொழி)','மொழி இந்தச் சாதனத்தில் சேமிக்கப்படும். பாதுகாப்பகத் தரவு மாறாது.',
    'இடைமுகம்','உங்களுக்கு ஏற்ற இடைமுகத்தைத் தேர்வுசெய்யவும்.','எளிய','நிபுணர்','தோற்றம்','எழுத்தளவு',
    'சாதனம்','ஒளி','இருள்','எனது பாதுகாப்பகம்','தேடு','குறியாக்கப்பட்டது','பாதுகாப்பகத்தைப் பூட்டு','புதிய பதிவு','முடிவுகள் இல்லை',
    'பாதுகாப்பகத்தைத் திற','பாதுகாப்பகத்தை உருவாக்கு','சேமி','ரத்துசெய்','கடவுச்சொல்','மின்னஞ்சல்','பயனர்பெயர்','மூடு','பெயர்'
  ],
  ko: [
    '금고','즐겨찾기','카테고리','개요','설정',
    '언어','자동(기기 언어)','언어 설정은 이 기기에 저장되며 금고 데이터는 변경되지 않습니다.',
    '화면 모드','원하는 화면을 선택하세요.','간편','전문가','테마','글자 크기',
    '시스템','라이트','다크','내 금고','검색','암호화됨','금고 잠금','새 항목','검색 결과 없음',
    '금고 잠금 해제','안전한 금고 만들기','저장','취소','비밀번호','이메일','사용자 이름','닫기','이름'
  ],
  fa: [
    'گاوصندوق','علاقه‌مندی‌ها','دسته‌ها','نمای کلی','تنظیمات',
    'زبان','خودکار (زبان دستگاه)','زبان در این دستگاه ذخیره می‌شود. داده‌های گاوصندوق تغییر نمی‌کنند.',
    'رابط کاربری','رابط دلخواه را انتخاب کنید.','ساده','پیشرفته','ظاهر','اندازه متن',
    'سیستم','روشن','تیره','گاوصندوق من','جستجو','رمزگذاری‌شده','قفل گاوصندوق','ورودی جدید','نتیجه‌ای یافت نشد',
    'باز کردن گاوصندوق','ایجاد گاوصندوق امن','ذخیره','لغو','گذرواژه','ایمیل','نام کاربری','بستن','نام'
  ],
  th: [
    'ตู้นิรภัย','รายการโปรด','หมวดหมู่','ภาพรวม','การตั้งค่า',
    'ภาษา','อัตโนมัติ (ภาษาของอุปกรณ์)','ภาษาจะถูกบันทึกในอุปกรณ์นี้ โดยไม่เปลี่ยนข้อมูลในตู้นิรภัย',
    'รูปแบบการใช้งาน','เลือกหน้าตาที่เหมาะกับคุณ','แบบง่าย','ขั้นสูง','รูปลักษณ์','ขนาดข้อความ',
    'ระบบ','สว่าง','มืด','ตู้นิรภัยของฉัน','ค้นหา','เข้ารหัสแล้ว','ล็อกตู้นิรภัย','รายการใหม่','ไม่พบผลลัพธ์',
    'ปลดล็อกตู้นิรภัย','สร้างตู้นิรภัยที่ปลอดภัย','บันทึก','ยกเลิก','รหัสผ่าน','อีเมล','ชื่อผู้ใช้','ปิด','ชื่อ'
  ]
};

const languageSet = new Set<string>(SUPPORTED_LANGUAGES.map(item => item.code));
const CATALOG: Record<AppLanguage, Record<string, string>> = Object.fromEntries(
  Object.entries(LINES).map(([locale, values]) => [locale,
    Object.fromEntries(KEYS.map((key, i) => [key, values[i] ?? '']))])
) as Record<AppLanguage, Record<string, string>>;

export function isLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && languageSet.has(value);
}
export function normalizeLanguagePreference(value: unknown): LanguagePreference {
  return value === 'system' || isLanguage(value) ? value : 'system';
}
export function detectDeviceLanguage(preferred: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages): AppLanguage {
  for (const raw of preferred) {
    const code = raw.toLowerCase().replace(/_/g, '-');
    if (code.startsWith('zh-hant') || code.startsWith('zh-tw') || code.startsWith('zh-hk')) {
      // Traditional Chinese has a different writing system; do not silently show Simplified.
      continue;
    }
    if (code.startsWith('zh')) return 'zh-Hans';
    const primary = code.split('-')[0];
    if (languageSet.has(primary)) return primary as AppLanguage;
  }
  return 'en';
}
export function resolveLanguage(preference: LanguagePreference, deviceLanguages?: readonly string[]): AppLanguage {
  return preference === 'system' ? detectDeviceLanguage(deviceLanguages) : preference;
}
export function isRTL(code: AppLanguage): boolean {
  return code === 'ar' || code === 'ur' || code === 'fa';
}
let activeLanguage: AppLanguage = 'de';
const subscribers = new Set<() => void>();
export function currentLanguage(): AppLanguage { return activeLanguage; }
export function applyLanguage(preference: LanguagePreference, deviceLanguages?: readonly string[]): void {
  const next = resolveLanguage(preference, deviceLanguages);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = next;
    document.documentElement.dir = isRTL(next) ? 'rtl' : 'ltr';
  }
  if (activeLanguage !== next) {
    activeLanguage = next;
    subscribers.forEach(listener => listener());
  }
}
const subscribe = (listener: () => void) => {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
};
const getSnapshot = () => activeLanguage;
export function tr(key: TranslationKey, language: AppLanguage = activeLanguage): string {
  return CATALOG[language]?.[key] || CATALOG.de[key] || key;
}
export function useTranslate(): (key: TranslationKey) => string {
  const language = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return (key: TranslationKey) => tr(key, language);
}
export function translationCoverage(language: AppLanguage): number {
  return KEYS.filter(key => Boolean(CATALOG[language]?.[key])).length / KEYS.length;
}
