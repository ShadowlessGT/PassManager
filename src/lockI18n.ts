import type { AppLanguage } from './i18n';

/** Localized onboarding text. Not used for stored vault data. */
const LOCK_KEYS = [
  'vaultHero', 'protectedHero', 'passwordHero', 'simpleHero',
  'openIntro', 'createIntro', 'encryptedNotice',
  'existingPassword', 'newPassword', 'passwordPlaceholder', 'minimumSix',
  'biometricOpen', 'existingFootnote', 'newFootnote'
] as const;
export type LockTextKey = (typeof LOCK_KEYS)[number];
const LOCK_LINES: Record<AppLanguage, readonly string[]> = {
  de: [
    'Dein Tresor.','Sicher geschützt.','Deine Passwörter.','Einfach aufbewahrt.',
    'Öffne deinen Tresor mit deinem Passwort oder deinem Fingerabdruck.',
    'Lege jetzt ein Passwort für deinen persönlichen Tresor fest. Damit bleiben deine gespeicherten Zugänge geschützt.',
    'Deine Daten werden verschlüsselt gespeichert','Dein Tresor-Passwort','Passwort für deinen Tresor',
    'Passwort eingeben','Ab 6 Zeichen möglich','Mit Fingerabdruck öffnen',
    'Dein Tresor-Passwort bleibt auf deinem Gerät.',
    'Wichtig: Schreibe dir dein Tresor-Passwort an einem sicheren Ort auf. Ohne dieses Passwort sind die Daten nicht wiederherstellbar.'
  ],
  en: [
    'Your vault.','Securely protected.','Your passwords.','Safely stored.',
    'Open your vault using your password or fingerprint.',
    'Create a password for your personal vault to protect your saved logins.',
    'Your data is stored encrypted','Your vault password','Password for your vault',
    'Enter password','At least 6 characters','Unlock with fingerprint',
    'Your vault password stays on your device.',
    'Important: Write down your vault password and keep it somewhere safe. Without it, your data cannot be recovered.'
  ],
  'zh-Hans': [
    '您的密码库。','安全保护。','您的密码。','轻松保存。',
    '使用密码或指纹打开密码库。',
    '请为个人密码库设置密码，以保护已保存的登录信息。',
    '您的数据将加密保存','密码库密码','设置密码库密码',
    '输入密码','至少 6 个字符','使用指纹解锁',
    '您的密码库密码仅保存在设备上。',
    '重要：请在安全的地方记下密码库密码。没有此密码，您的数据将无法恢复。'
  ],
  hi: [
    'आपका वॉल्ट।','सुरक्षित।','आपके पासवर्ड।','आसानी से सुरक्षित।',
    'पासवर्ड या फ़िंगरप्रिंट से अपना वॉल्ट खोलें।',
    'सहेजे गए लॉगिन सुरक्षित रखने के लिए अपने वॉल्ट का पासवर्ड बनाएँ।',
    'आपका डेटा एन्क्रिप्ट करके रखा जाता है','वॉल्ट का पासवर्ड','अपने वॉल्ट के लिए पासवर्ड',
    'पासवर्ड दर्ज करें','कम से कम 6 अक्षर','फ़िंगरप्रिंट से खोलें',
    'आपका वॉल्ट पासवर्ड आपके डिवाइस पर रहता है।',
    'महत्वपूर्ण: अपना वॉल्ट पासवर्ड लिखकर सुरक्षित जगह रखें। इसके बिना डेटा वापस नहीं मिल सकता।'
  ],
  es: [
    'Tu bóveda.','Bien protegida.','Tus contraseñas.','Siempre a mano.',
    'Abre tu bóveda con tu contraseña o huella digital.',
    'Crea una contraseña para proteger los accesos guardados en tu bóveda personal.',
    'Tus datos se guardan cifrados','Contraseña de la bóveda','Contraseña para tu bóveda',
    'Introduce la contraseña','Mínimo 6 caracteres','Abrir con huella digital',
    'La contraseña de tu bóveda permanece en tu dispositivo.',
    'Importante: Guarda tu contraseña de la bóveda en un lugar seguro. Sin ella, no podrás recuperar los datos.'
  ],
  ar: [
    'خزنتك.','محمية بأمان.','كلمات مرورك.','محفوظة بسهولة.',
    'افتح خزنتك باستخدام كلمة المرور أو بصمة الإصبع.',
    'أنشئ كلمة مرور لخزنتك الشخصية لحماية بيانات تسجيل الدخول المحفوظة.',
    'تُحفظ بياناتك مشفّرة','كلمة مرور الخزنة','كلمة مرور خزنتك',
    'أدخل كلمة المرور','٦ أحرف على الأقل','فتح ببصمة الإصبع',
    'تبقى كلمة مرور خزنتك على جهازك.',
    'مهم: دوّن كلمة مرور خزنتك واحتفظ بها في مكان آمن. بدونها لا يمكن استعادة بياناتك.'
  ],
  fr: [
    'Votre coffre.','Bien protégé.','Vos mots de passe.','Bien rangés.',
    'Ouvrez votre coffre avec votre mot de passe ou votre empreinte digitale.',
    'Créez un mot de passe pour votre coffre personnel afin de protéger vos identifiants.',
    'Vos données sont stockées sous forme chiffrée','Mot de passe du coffre','Mot de passe de votre coffre',
    'Saisir le mot de passe','6 caractères minimum','Ouvrir avec une empreinte',
    'Le mot de passe de votre coffre reste sur cet appareil.',
    'Important : notez le mot de passe de votre coffre et conservez-le en lieu sûr. Sans lui, vos données ne peuvent pas être récupérées.'
  ],
  bn: [
    'আপনার ভল্ট।','নিরাপদে সুরক্ষিত।','আপনার পাসওয়ার্ড।','সহজে সংরক্ষিত।',
    'পাসওয়ার্ড বা আঙুলের ছাপ দিয়ে আপনার ভল্ট খুলুন।',
    'সংরক্ষিত লগইন সুরক্ষিত রাখতে ব্যক্তিগত ভল্টের জন্য পাসওয়ার্ড তৈরি করুন।',
    'আপনার ডেটা এনক্রিপ্ট করে সংরক্ষিত হয়','ভল্টের পাসওয়ার্ড','ভল্টের জন্য পাসওয়ার্ড',
    'পাসওয়ার্ড লিখুন','কমপক্ষে ৬টি অক্ষর','আঙুলের ছাপ দিয়ে খুলুন',
    'আপনার ভল্টের পাসওয়ার্ড এই ডিভাইসেই থাকে।',
    'গুরুত্বপূর্ণ: ভল্টের পাসওয়ার্ড লিখে নিরাপদ স্থানে রাখুন। এটি ছাড়া ডেটা পুনরুদ্ধার করা যাবে না।'
  ],
  pt: [
    'Seu cofre.','Bem protegido.','Suas senhas.','Sempre organizadas.',
    'Abra seu cofre com a senha ou impressão digital.',
    'Crie uma senha para seu cofre pessoal e proteja os acessos salvos.',
    'Seus dados são armazenados com criptografia','Senha do cofre','Senha para seu cofre',
    'Digite a senha','Pelo menos 6 caracteres','Abrir com impressão digital',
    'A senha do cofre permanece no seu dispositivo.',
    'Importante: Anote a senha do cofre e guarde em local seguro. Sem ela, seus dados não poderão ser recuperados.'
  ],
  id: [
    'Brankas Anda.','Terlindungi dengan aman.','Kata sandi Anda.','Tersimpan dengan mudah.',
    'Buka brankas dengan kata sandi atau sidik jari.',
    'Buat kata sandi untuk brankas pribadi Anda agar login tersimpan tetap aman.',
    'Data Anda disimpan dalam bentuk terenkripsi','Kata sandi brankas','Kata sandi untuk brankas',
    'Masukkan kata sandi','Minimal 6 karakter','Buka dengan sidik jari',
    'Kata sandi brankas tetap berada di perangkat Anda.',
    'Penting: Catat kata sandi brankas dan simpan di tempat aman. Tanpanya, data tidak dapat dipulihkan.'
  ],
  ur: [
    'آپ کا محفوظ خانہ۔','مکمل حفاظت۔','آپ کے پاس ورڈ۔','آسانی سے محفوظ۔',
    'اپنا محفوظ خانہ پاس ورڈ یا فنگر پرنٹ سے کھولیں۔',
    'محفوظ کردہ لاگ اِن کی حفاظت کے لیے اپنے محفوظ خانے کا پاس ورڈ بنائیں۔',
    'آپ کا ڈیٹا خفیہ صورت میں محفوظ ہوتا ہے','محفوظ خانے کا پاس ورڈ','اپنے محفوظ خانے کا پاس ورڈ',
    'پاس ورڈ درج کریں','کم از کم ۶ حروف','فنگر پرنٹ سے کھولیں',
    'آپ کے محفوظ خانے کا پاس ورڈ اسی ڈیوائس پر رہتا ہے۔',
    'اہم: محفوظ خانے کا پاس ورڈ لکھ کر محفوظ جگہ رکھیں۔ اس کے بغیر ڈیٹا واپس حاصل نہیں کیا جا سکتا۔'
  ],
  ru: [
    'Ваше хранилище.','Надёжно защищено.','Ваши пароли.','Удобно сохранены.',
    'Откройте хранилище паролем или отпечатком пальца.',
    'Создайте пароль для личного хранилища, чтобы защитить сохранённые данные.',
    'Данные хранятся в зашифрованном виде','Пароль хранилища','Пароль для хранилища',
    'Введите пароль','Не менее 6 символов','Открыть по отпечатку',
    'Пароль хранилища остаётся на вашем устройстве.',
    'Важно: запишите пароль хранилища и храните его в надёжном месте. Без него данные восстановить нельзя.'
  ],
  ja: [
    'あなたの保管庫。','安全に保護。','あなたのパスワード。','かんたん保存。',
    'パスワードまたは指紋で保管庫を開きます。',
    '保存したログイン情報を守るため、保管庫のパスワードを作成してください。',
    'データは暗号化して保存されます','保管庫のパスワード','保管庫のパスワードを設定',
    'パスワードを入力','6文字以上','指紋で開く',
    '保管庫のパスワードはこの端末にのみ保存されます。',
    '重要：保管庫のパスワードを安全な場所に記録してください。忘れるとデータを復元できません。'
  ],
  vi: [
    'Kho của bạn.','Được bảo vệ an toàn.','Mật khẩu của bạn.','Lưu trữ dễ dàng.',
    'Mở kho bằng mật khẩu hoặc dấu vân tay.',
    'Tạo mật khẩu cho kho cá nhân để bảo vệ các thông tin đăng nhập đã lưu.',
    'Dữ liệu của bạn được lưu dưới dạng mã hóa','Mật khẩu kho','Mật khẩu cho kho của bạn',
    'Nhập mật khẩu','Ít nhất 6 ký tự','Mở bằng vân tay',
    'Mật khẩu kho chỉ được giữ trên thiết bị của bạn.',
    'Quan trọng: Hãy ghi lại mật khẩu kho và cất ở nơi an toàn. Không có mật khẩu này thì không thể khôi phục dữ liệu.'
  ],
  sw: [
    'Hifadhi yako.','Imelindwa vizuri.','Nywila zako.','Zimehifadhiwa kwa urahisi.',
    'Fungua hifadhi kwa nenosiri au alama ya kidole.',
    'Unda nenosiri kwa hifadhi yako binafsi ili kulinda taarifa za kuingia.',
    'Data yako huhifadhiwa kwa usimbaji fiche','Nenosiri la hifadhi','Nenosiri la hifadhi yako',
    'Weka nenosiri','Angalau herufi 6','Fungua kwa alama ya kidole',
    'Nenosiri la hifadhi hubaki kwenye kifaa chako.',
    'Muhimu: Andika nenosiri la hifadhi na uliweke sehemu salama. Bila nenosiri hilo, data haiwezi kurejeshwa.'
  ],
  tr: [
    'Senin kasan.','Güvenle korunur.','Şifrelerin.','Kolayca saklanır.',
    'Kasanı şifren veya parmak izinle aç.',
    'Kayıtlı giriş bilgilerini korumak için kişisel kasana bir şifre belirle.',
    'Verilerin şifrelenerek saklanır','Kasa şifren','Kasan için şifre',
    'Şifreni gir','En az 6 karakter','Parmak iziyle aç',
    'Kasa şifren yalnızca cihazında kalır.',
    'Önemli: Kasa şifreni yazıp güvenli bir yerde sakla. Bu şifre olmadan verilerin kurtarılamaz.'
  ],
  ta: [
    'உங்கள் பாதுகாப்பகம்.','பாதுகாப்பாக உள்ளது.','உங்கள் கடவுச்சொற்கள்.','எளிதாகச் சேமிப்பு.',
    'கடவுச்சொல் அல்லது கைரேகையால் பாதுகாப்பகத்தைத் திறக்கவும்.',
    'சேமித்த உள்நுழைவுகளைப் பாதுகாக்க, உங்கள் பாதுகாப்பகத்திற்கு ஒரு கடவுச்சொல்லை அமைக்கவும்.',
    'உங்கள் தரவு குறியாக்கம் செய்து சேமிக்கப்படுகிறது','பாதுகாப்பகக் கடவுச்சொல்','பாதுகாப்பகத்திற்கான கடவுச்சொல்',
    'கடவுச்சொல்லை உள்ளிடவும்','குறைந்தது 6 எழுத்துகள்','கைரேகையால் திறக்கவும்',
    'பாதுகாப்பகக் கடவுச்சொல் உங்கள் சாதனத்திலேயே இருக்கும்.',
    'முக்கியம்: பாதுகாப்பகக் கடவுச்சொல்லை எழுதி பாதுகாப்பான இடத்தில் வைக்கவும். அது இல்லாமல் தரவை மீட்டெடுக்க முடியாது.'
  ],
  ko: [
    '나의 금고.','안전하게 보호.','나의 비밀번호.','간편한 보관.',
    '비밀번호나 지문으로 금고를 여세요.',
    '저장된 로그인 정보를 보호하려면 금고 비밀번호를 설정하세요.',
    '데이터는 암호화되어 저장됩니다','금고 비밀번호','금고 비밀번호 설정',
    '비밀번호 입력','최소 6자','지문으로 열기',
    '금고 비밀번호는 이 기기에만 남습니다.',
    '중요: 금고 비밀번호를 적어 안전한 곳에 보관하세요. 이 비밀번호가 없으면 데이터를 복구할 수 없습니다.'
  ],
  fa: [
    'گاوصندوق شما.','ایمن و محافظت‌شده.','گذرواژه‌های شما.','نگهداری آسان.',
    'گاوصندوق خود را با گذرواژه یا اثر انگشت باز کنید.',
    'برای محافظت از اطلاعات ورود، یک گذرواژه برای گاوصندوق شخصی خود بسازید.',
    'داده‌های شما به‌صورت رمزگذاری‌شده ذخیره می‌شوند','گذرواژهٔ گاوصندوق','گذرواژه برای گاوصندوق',
    'گذرواژه را وارد کنید','حداقل ۶ نویسه','باز کردن با اثر انگشت',
    'گذرواژهٔ گاوصندوق روی دستگاه شما باقی می‌ماند.',
    'مهم: گذرواژهٔ گاوصندوق را نوشته و در جایی امن نگه دارید. بدون آن امکان بازیابی داده‌ها وجود ندارد.'
  ],
  th: [
    'ตู้นิรภัยของคุณ','ปกป้องอย่างปลอดภัย','รหัสผ่านของคุณ','จัดเก็บได้ง่าย',
    'เปิดตู้นิรภัยด้วยรหัสผ่านหรือลายนิ้วมือ',
    'ตั้งรหัสผ่านสำหรับตู้นิรภัยส่วนตัวเพื่อป้องกันข้อมูลเข้าสู่ระบบที่บันทึกไว้',
    'ข้อมูลของคุณถูกเก็บแบบเข้ารหัส','รหัสผ่านตู้นิรภัย','ตั้งรหัสผ่านตู้นิรภัย',
    'ป้อนรหัสผ่าน','อย่างน้อย 6 อักขระ','เปิดด้วยลายนิ้วมือ',
    'รหัสผ่านตู้นิรภัยจะอยู่บนอุปกรณ์ของคุณเท่านั้น',
    'สำคัญ: จดรหัสผ่านตู้นิรภัยและเก็บไว้ในที่ปลอดภัย หากไม่มีรหัสผ่านนี้จะไม่สามารถกู้คืนข้อมูลได้'
  ]
};
const map = Object.fromEntries(Object.entries(LOCK_LINES).map(([locale, texts]) => [
  locale, Object.fromEntries(LOCK_KEYS.map((key, index) => [key, texts[index]]))
])) as Record<AppLanguage, Record<LockTextKey, string>>;
export function lockText(key: LockTextKey, locale: AppLanguage): string {
  return map[locale]?.[key] || map.de[key];
}
export function lockCoverage(locale: AppLanguage): number {
  return LOCK_KEYS.filter(key => !!map[locale]?.[key]).length / LOCK_KEYS.length;
}
