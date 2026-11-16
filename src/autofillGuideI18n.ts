import type { AppLanguage } from './i18n';

/**
 * Help text for Android Autofill capture. Every supported language is
 * intentionally provided rather than relying on German fallback text.
 * UI names vary between Chrome/Android releases, so the copy says so.
 */
export type AutofillGuideText = {
  title: string;
  teaser: string;
  expand: string;
  androidTitle: string;
  androidSteps: readonly [string, string];
  chromeTitle: string;
  chromeSteps: readonly [string, string, string, string];
  testTitle: string;
  testSteps: readonly [string, string];
  troubleshootingTitle: string;
  troubleshooting: string;
  limitation: string;
};
export const AUTOFILL_GUIDES: Record<AppLanguage, AutofillGuideText> = {
  de: {
    title: 'Passwörter mit Parola erkennen – so geht es',
    teaser: 'Wichtig: Chrome kann weiterhin Google nutzen, obwohl Parola als Android-Dienst aktiv ist.',
    expand: 'Einrichtung und Fehlerbehebung anzeigen',
    androidTitle: '1. Parola unter Android auswählen',
    androidSteps: ['Aktiviere in Parola unter Einstellungen die automatische Passworterkennung.', 'Wähle in den Android-Einstellungen „Password Manager: Parola“ als bevorzugten Autofill-Dienst.'],
    chromeTitle: '2. Chrome auf Parola umstellen',
    chromeSteps: ['Öffne Chrome → ⋮ → Einstellungen.', 'Öffne „Autofill und Passwörter“ → „Autofill-Dienste“ (Bezeichnungen können abweichen).', 'Wähle „Autofill mit einem anderen Dienst“ statt „Autofill mit Google“.', 'Starte Chrome neu, falls du dazu aufgefordert wirst.'],
    testTitle: '3. Mit einem Testkonto ausprobieren',
    testSteps: ['Melde dich auf einer unterstützten Website mit erfundenen Zugangsdaten an und sende das Formular ab.', 'Bestätige den Android-Speichervorschlag. Öffne dann Parola, prüfe den erkannten Login und speichere ihn im Tresor.'],
    troubleshootingTitle: 'Google fragt weiterhin nach dem Speichern?',
    troubleshooting: 'Prüfe erneut den Autofill-Dienst in Chrome. Googles Passwortmanager kann einen eigenen Speicherdialog anzeigen. Nicht jede Website oder App unterstützt die Android-Passworterkennung.',
    limitation: 'Parola kann derzeit neue Zugangsdaten zum Speichern anbieten. Das Ausfüllen bereits gespeicherter Passwörter ist noch nicht verfügbar.'
  },
  en: {
    title: 'Save passwords with Parola – setup guide',
    teaser: 'Important: Chrome may still use Google even when Parola is enabled as the Android service.',
    expand: 'Show setup and troubleshooting steps',
    androidTitle: '1. Select Parola on Android',
    androidSteps: ['Turn on automatic password detection in Parola Settings.', 'In Android settings, select “Password Manager: Parola” as your preferred autofill service.'],
    chromeTitle: '2. Switch Chrome to Parola',
    chromeSteps: ['Open Chrome → ⋮ → Settings.', 'Open “Autofill and passwords” → “Autofill services” (menu names may vary).', 'Choose “Autofill using another service” instead of “Autofill with Google”.', 'Restart Chrome if prompted.'],
    testTitle: '3. Try it with a test account',
    testSteps: ['Sign in on a supported site using made-up credentials and submit the form.', 'Accept the Android save prompt. Then open Parola, review the detected login and save it to your vault.'],
    troubleshootingTitle: 'Is Google still asking to save?',
    troubleshooting: 'Check Chrome’s autofill service setting again. Google Password Manager may show its own save prompt. Not every website or app supports Android password capture.',
    limitation: 'Parola currently offers to save new credentials. Filling existing passwords in other apps is not yet available.'
  },
  'zh-Hans': {
    title: '使用 Parola 保存密码：设置指南',
    teaser: '注意：即使已将 Parola 设为 Android 服务，Chrome 仍可能使用 Google。',
    expand: '查看设置步骤与故障排除',
    androidTitle: '1. 在 Android 中选择 Parola',
    androidSteps: ['在 Parola 设置中开启自动密码识别。', '在 Android 设置中，将“Password Manager: Parola”选为首选自动填充服务。'],
    chromeTitle: '2. 将 Chrome 切换到 Parola',
    chromeSteps: ['打开 Chrome → ⋮ → 设置。', '打开“自动填充和密码”→“自动填充服务”（菜单名称可能有所不同）。', '选择“使用其他服务自动填充”，而不是“使用 Google 自动填充”。', '如果出现提示，请重新启动 Chrome。'],
    testTitle: '3. 使用测试账号验证',
    testSteps: ['在支持的网站上使用虚构的账号和密码登录，并提交表单。', '确认 Android 的保存提示，然后打开 Parola，检查识别的登录信息并保存到保险库。'],
    troubleshootingTitle: '仍然由 Google 提示保存？',
    troubleshooting: '再次检查 Chrome 的自动填充服务设置。Google 密码管理工具可能显示自己的保存提示。并非所有网站或应用都支持 Android 密码识别。',
    limitation: 'Parola 目前可以提示保存新账号密码，但尚不能在其他应用中自动填充已保存的密码。'
  },
  hi: {
    title: 'Parola से पासवर्ड सेव करें – सेटअप गाइड',
    teaser: 'ध्यान दें: Android में Parola सक्रिय होने पर भी Chrome, Google का उपयोग कर सकता है।',
    expand: 'सेटअप और समस्या समाधान के चरण देखें',
    androidTitle: '1. Android में Parola चुनें',
    androidSteps: ['Parola की सेटिंग में स्वचालित पासवर्ड पहचान चालू करें।', 'Android सेटिंग में “Password Manager: Parola” को पसंदीदा ऑटोफिल सेवा चुनें।'],
    chromeTitle: '2. Chrome को Parola पर स्विच करें',
    chromeSteps: ['Chrome खोलें → ⋮ → सेटिंग।', '“Autofill and passwords” → “Autofill services” खोलें (नाम अलग हो सकते हैं)।', '“Autofill with Google” के बजाय “Autofill using another service” चुनें।', 'पूछे जाने पर Chrome फिर शुरू करें।'],
    testTitle: '3. टेस्ट खाते से जाँचें',
    testSteps: ['किसी समर्थित वेबसाइट पर काल्पनिक लॉगिन विवरण भरकर फ़ॉर्म सबमिट करें।', 'Android का सेव सुझाव स्वीकार करें। फिर Parola खोलकर मिले हुए लॉगिन की जाँच करें और वॉल्ट में सेव करें।'],
    troubleshootingTitle: 'क्या Google अभी भी सेव करने को कह रहा है?',
    troubleshooting: 'Chrome की ऑटोफिल सेवा सेटिंग फिर जाँचें। Google Password Manager अपना अलग सेव सुझाव दिखा सकता है। सभी ऐप और वेबसाइट Android पासवर्ड पहचान को सपोर्ट नहीं करते।',
    limitation: 'Parola अभी नए लॉगिन सेव करने का सुझाव देता है। दूसरे ऐप में सेव किए गए पासवर्ड भरना अभी उपलब्ध नहीं है।'
  },
  es: {
    title: 'Guardar contraseñas con Parola: guía de configuración',
    teaser: 'Importante: Chrome puede seguir usando Google aunque Parola esté activo en Android.',
    expand: 'Ver los pasos de configuración y solución de problemas',
    androidTitle: '1. Elegir Parola en Android',
    androidSteps: ['Activa la detección automática de contraseñas en los ajustes de Parola.', 'En los ajustes de Android, elige «Password Manager: Parola» como servicio de autocompletado preferido.'],
    chromeTitle: '2. Cambiar Chrome a Parola',
    chromeSteps: ['Abre Chrome → ⋮ → Configuración.', 'Ve a «Autocompletar y contraseñas» → «Servicios de autocompletado» (los nombres pueden variar).', 'Selecciona «Autocompletar con otro servicio» en lugar de «Autocompletar con Google».', 'Reinicia Chrome si se solicita.'],
    testTitle: '3. Probar con una cuenta de prueba',
    testSteps: ['Inicia sesión en un sitio compatible usando credenciales inventadas y envía el formulario.', 'Acepta la sugerencia de Android para guardar. Abre Parola, revisa los datos detectados y guárdalos en tu bóveda.'],
    troubleshootingTitle: '¿Google sigue preguntando si quieres guardar?',
    troubleshooting: 'Vuelve a comprobar el servicio de autocompletado en Chrome. El Gestor de contraseñas de Google puede mostrar su propio aviso. No todas las webs y aplicaciones admiten esta función de Android.',
    limitation: 'Parola permite guardar nuevas credenciales. Todavía no rellena contraseñas guardadas en otras aplicaciones.'
  },
  ar: {
    title: 'حفظ كلمات المرور باستخدام Parola – دليل الإعداد',
    teaser: 'مهم: قد يستمر Chrome في استخدام Google حتى لو كانت خدمة Parola مفعّلة في Android.',
    expand: 'عرض خطوات الإعداد وحل المشكلات',
    androidTitle: '1. اختيار Parola في Android',
    androidSteps: ['فعّل اكتشاف كلمات المرور تلقائيًا من إعدادات Parola.', 'من إعدادات Android، اختر “Password Manager: Parola” بوصفه خدمة الملء التلقائي المفضلة.'],
    chromeTitle: '2. تحويل Chrome لاستخدام Parola',
    chromeSteps: ['افتح Chrome ← ⋮ ← الإعدادات.', 'افتح «الملء التلقائي وكلمات المرور» ← «خدمات الملء التلقائي» (قد تختلف أسماء القوائم).', 'اختر «الملء التلقائي باستخدام خدمة أخرى» بدلًا من «الملء التلقائي باستخدام Google».', 'أعد تشغيل Chrome إذا طُلب منك ذلك.'],
    testTitle: '3. التجربة باستخدام حساب اختباري',
    testSteps: ['سجّل الدخول إلى موقع مدعوم ببيانات وهمية ثم أرسل النموذج.', 'وافق على اقتراح Android للحفظ، ثم افتح Parola وراجع بيانات الدخول المكتشفة واحفظها في الخزنة.'],
    troubleshootingTitle: 'هل ما زال Google يطلب حفظ كلمة المرور؟',
    troubleshooting: 'تحقق مجددًا من خدمة الملء التلقائي في Chrome. قد يعرض مدير كلمات المرور من Google رسالة حفظ مستقلة. ليست كل المواقع والتطبيقات تدعم اكتشاف كلمات المرور عبر Android.',
    limitation: 'يتيح Parola حاليًا حفظ بيانات الدخول الجديدة، لكنه لا يملأ كلمات المرور المحفوظة في التطبيقات الأخرى بعد.'
  },
  fr: {
    title: 'Enregistrer les mots de passe avec Parola – guide',
    teaser: 'Important : Chrome peut continuer à utiliser Google même si Parola est activé sur Android.',
    expand: 'Afficher la configuration et le dépannage',
    androidTitle: '1. Sélectionner Parola sur Android',
    androidSteps: ['Activez la détection automatique des mots de passe dans les paramètres de Parola.', 'Dans les paramètres Android, choisissez « Password Manager: Parola » comme service de saisie automatique préféré.'],
    chromeTitle: '2. Configurer Chrome pour Parola',
    chromeSteps: ['Ouvrez Chrome → ⋮ → Paramètres.', 'Ouvrez « Saisie automatique et mots de passe » → « Services de saisie automatique » (les intitulés peuvent varier).', 'Choisissez « Utiliser un autre service de saisie automatique » plutôt que « Utiliser Google ».', 'Redémarrez Chrome si demandé.'],
    testTitle: '3. Tester avec un compte fictif',
    testSteps: ['Connectez-vous à un site compatible avec des identifiants fictifs et validez le formulaire.', 'Acceptez la proposition d’enregistrement d’Android. Ouvrez Parola, vérifiez le compte détecté et enregistrez-le dans le coffre.'],
    troubleshootingTitle: 'Google propose toujours d’enregistrer ?',
    troubleshooting: 'Vérifiez à nouveau le service de saisie automatique de Chrome. Le gestionnaire de mots de passe Google peut afficher sa propre proposition. Tous les sites et applications ne sont pas compatibles.',
    limitation: 'Parola propose actuellement d’enregistrer les nouveaux identifiants. Le remplissage de mots de passe existants dans d’autres applications n’est pas encore disponible.'
  },
  bn: {
    title: 'Parola দিয়ে পাসওয়ার্ড সংরক্ষণ – সেটআপ নির্দেশিকা',
    teaser: 'গুরুত্বপূর্ণ: Android-এ Parola চালু থাকলেও Chrome এখনও Google ব্যবহার করতে পারে।',
    expand: 'সেটআপ ও সমস্যার সমাধানের ধাপ দেখুন',
    androidTitle: '১. Android-এ Parola নির্বাচন করুন',
    androidSteps: ['Parola-র সেটিংস থেকে স্বয়ংক্রিয় পাসওয়ার্ড শনাক্তকরণ চালু করুন।', 'Android সেটিংসে “Password Manager: Parola” পছন্দের অটোফিল পরিষেবা হিসেবে নির্বাচন করুন।'],
    chromeTitle: '২. Chrome-এ Parola ব্যবহার করুন',
    chromeSteps: ['Chrome খুলুন → ⋮ → Settings।', '“Autofill and passwords” → “Autofill services” খুলুন (মেনুর নাম আলাদা হতে পারে)।', '“Autofill with Google”-এর বদলে “Autofill using another service” নির্বাচন করুন।', 'প্রয়োজন হলে Chrome আবার চালু করুন।'],
    testTitle: '৩. পরীক্ষামূলক অ্যাকাউন্ট দিয়ে যাচাই করুন',
    testSteps: ['সমর্থিত ওয়েবসাইটে কাল্পনিক লগইন তথ্য দিয়ে ফর্ম জমা দিন।', 'Android-এর সংরক্ষণের প্রস্তাব গ্রহণ করুন। এরপর Parola খুলে শনাক্ত হওয়া লগইন যাচাই করে ভল্টে সংরক্ষণ করুন।'],
    troubleshootingTitle: 'Google এখনও পাসওয়ার্ড সংরক্ষণ করতে বলছে?',
    troubleshooting: 'Chrome-এর অটোফিল সেটিংস আবার দেখুন। Google Password Manager নিজস্ব সংরক্ষণের বার্তা দেখাতে পারে। সব ওয়েবসাইট বা অ্যাপ Android পাসওয়ার্ড শনাক্তকরণ সমর্থন করে না।',
    limitation: 'Parola এখন নতুন লগইন সংরক্ষণের প্রস্তাব দেয়; অন্য অ্যাপে আগে সংরক্ষিত পাসওয়ার্ড পূরণ করার সুবিধা এখনও নেই।'
  },
  pt: {
    title: 'Salvar senhas com Parola – guia de configuração',
    teaser: 'Importante: o Chrome ainda pode usar o Google, mesmo com o Parola ativado no Android.',
    expand: 'Mostrar configuração e solução de problemas',
    androidTitle: '1. Selecionar Parola no Android',
    androidSteps: ['Ative a detecção automática de senhas nas configurações do Parola.', 'Nas configurações do Android, escolha “Password Manager: Parola” como serviço de preenchimento automático preferido.'],
    chromeTitle: '2. Configurar o Chrome para Parola',
    chromeSteps: ['Abra o Chrome → ⋮ → Configurações.', 'Abra “Preenchimento automático e senhas” → “Serviços de preenchimento automático” (os nomes podem variar).', 'Escolha “Preencher usando outro serviço” em vez de “Preencher com Google”.', 'Reinicie o Chrome, se solicitado.'],
    testTitle: '3. Testar com uma conta de teste',
    testSteps: ['Entre em um site compatível usando dados fictícios e envie o formulário.', 'Aceite a sugestão do Android para salvar. Abra o Parola, confira o login detectado e salve-o no cofre.'],
    troubleshootingTitle: 'O Google ainda pergunta se deseja salvar?',
    troubleshooting: 'Confira novamente o serviço de preenchimento automático do Chrome. O Gerenciador de Senhas do Google pode exibir seu próprio aviso. Nem todos os sites e apps são compatíveis.',
    limitation: 'O Parola oferece o salvamento de novos logins. O preenchimento de senhas já salvas em outros apps ainda não está disponível.'
  },
  id: {
    title: 'Simpan kata sandi dengan Parola – panduan',
    teaser: 'Penting: Chrome mungkin tetap memakai Google meskipun Parola aktif sebagai layanan Android.',
    expand: 'Lihat langkah pengaturan dan pemecahan masalah',
    androidTitle: '1. Pilih Parola di Android',
    androidSteps: ['Aktifkan pendeteksian kata sandi otomatis di Pengaturan Parola.', 'Di pengaturan Android, pilih “Password Manager: Parola” sebagai layanan isi otomatis utama.'],
    chromeTitle: '2. Alihkan Chrome ke Parola',
    chromeSteps: ['Buka Chrome → ⋮ → Setelan.', 'Buka “Isi otomatis dan sandi” → “Layanan isi otomatis” (nama menu mungkin berbeda).', 'Pilih “Isi otomatis menggunakan layanan lain”, bukan “Isi otomatis dengan Google”.', 'Mulai ulang Chrome jika diminta.'],
    testTitle: '3. Coba dengan akun uji',
    testSteps: ['Masuk ke situs yang didukung memakai data akun fiktif lalu kirim formulir.', 'Setujui tawaran simpan dari Android. Buka Parola, periksa login yang terdeteksi, lalu simpan ke brankas.'],
    troubleshootingTitle: 'Google masih menawarkan penyimpanan?',
    troubleshooting: 'Periksa lagi setelan layanan isi otomatis di Chrome. Pengelola Sandi Google dapat menampilkan tawaran simpannya sendiri. Tidak semua situs atau aplikasi mendukung pendeteksian sandi Android.',
    limitation: 'Parola saat ini menawarkan penyimpanan login baru. Pengisian sandi tersimpan di aplikasi lain belum tersedia.'
  },
  ur: {
    title: 'Parola کے ذریعے پاس ورڈ محفوظ کریں – رہنمائی',
    teaser: 'اہم: Android میں Parola فعال ہونے کے باوجود Chrome اب بھی Google استعمال کر سکتا ہے۔',
    expand: 'سیٹ اپ اور مسئلے کے حل کے مراحل دیکھیں',
    androidTitle: '۱۔ Android میں Parola منتخب کریں',
    androidSteps: ['Parola کی ترتیبات میں پاس ورڈ کی خودکار شناخت فعال کریں۔', 'Android کی ترتیبات میں “Password Manager: Parola” کو ترجیحی آٹو فل سروس منتخب کریں۔'],
    chromeTitle: '۲۔ Chrome کو Parola پر منتقل کریں',
    chromeSteps: ['Chrome کھولیں ← ⋮ ← ترتیبات۔', '“Autofill and passwords” ← “Autofill services” کھولیں (مینو کے نام مختلف ہو سکتے ہیں)۔', '“Autofill with Google” کے بجائے “Autofill using another service” منتخب کریں۔', 'اگر کہا جائے تو Chrome دوبارہ شروع کریں۔'],
    testTitle: '۳۔ آزمائشی اکاؤنٹ سے جانچ کریں',
    testSteps: ['کسی معاون ویب سائٹ پر فرضی لاگ اِن معلومات درج کر کے فارم جمع کرائیں۔', 'Android کی محفوظ کرنے کی تجویز منظور کریں، پھر Parola کھول کر شناخت شدہ لاگ اِن جانچیں اور والٹ میں محفوظ کریں۔'],
    troubleshootingTitle: 'کیا Google اب بھی محفوظ کرنے کو کہتا ہے؟',
    troubleshooting: 'Chrome کی آٹو فل ترتیبات دوبارہ دیکھیں۔ Google Password Manager اپنا الگ پیغام دکھا سکتا ہے۔ ہر ویب سائٹ یا ایپ Android کی پاس ورڈ شناخت کی سہولت فراہم نہیں کرتی۔',
    limitation: 'Parola فی الحال نئے لاگ اِن محفوظ کرنے کی پیشکش کرتا ہے۔ دیگر ایپس میں پہلے سے محفوظ پاس ورڈ بھرنے کی سہولت ابھی دستیاب نہیں۔'
  },
  ru: {
    title: 'Сохранение паролей через Parola — инструкция',
    teaser: 'Важно: Chrome может продолжать использовать Google, даже если Parola включён в Android.',
    expand: 'Показать настройку и решение проблем',
    androidTitle: '1. Выберите Parola в Android',
    androidSteps: ['Включите автоматическое распознавание паролей в настройках Parola.', 'В настройках Android выберите «Password Manager: Parola» как основной сервис автозаполнения.'],
    chromeTitle: '2. Переключите Chrome на Parola',
    chromeSteps: ['Откройте Chrome → ⋮ → Настройки.', 'Откройте «Автозаполнение и пароли» → «Сервисы автозаполнения» (названия могут отличаться).', 'Выберите «Автозаполнение с помощью другого сервиса» вместо «Автозаполнение через Google».', 'Перезапустите Chrome, если появится запрос.'],
    testTitle: '3. Проверьте на тестовом аккаунте',
    testSteps: ['Войдите на поддерживаемом сайте с выдуманными учётными данными и отправьте форму.', 'Подтвердите сохранение в Android. Откройте Parola, проверьте найденный вход и сохраните его в хранилище.'],
    troubleshootingTitle: 'Google всё ещё предлагает сохранить пароль?',
    troubleshooting: 'Ещё раз проверьте сервис автозаполнения в Chrome. Менеджер паролей Google может показывать собственный запрос. Не все сайты и приложения поддерживают сохранение через Android.',
    limitation: 'Сейчас Parola предлагает сохранять новые учётные данные. Автозаполнение ранее сохранённых паролей в других приложениях пока недоступно.'
  },
  ja: {
    title: 'Parola でパスワードを保存する設定方法',
    teaser: '重要：Android で Parola が有効でも、Chrome が Google を使い続ける場合があります。',
    expand: '設定手順とトラブルシューティングを表示',
    androidTitle: '1. Android で Parola を選択',
    androidSteps: ['Parola の設定でパスワードの自動検出を有効にします。', 'Android の設定で「Password Manager: Parola」を優先する自動入力サービスに選びます。'],
    chromeTitle: '2. Chrome を Parola に切り替える',
    chromeSteps: ['Chrome を開き、⋮ → 設定に進みます。', '「自動入力とパスワード」→「自動入力サービス」を開きます（表示名は異なる場合があります）。', '「Google で自動入力」ではなく「別のサービスで自動入力」を選びます。', '求められた場合は Chrome を再起動します。'],
    testTitle: '3. テストアカウントで確認',
    testSteps: ['対応サイトで架空のユーザー名とパスワードを入力し、ログインフォームを送信します。', 'Android の保存確認を承認し、Parola を開いて検出されたログインを確認して保管庫に保存します。'],
    troubleshootingTitle: 'まだ Google が保存を提案する場合',
    troubleshooting: 'Chrome の自動入力サービス設定を再確認してください。Google パスワードマネージャーは独自の保存確認を表示することがあります。すべてのサイトやアプリに対応しているわけではありません。',
    limitation: '現在の Parola は新しいログイン情報の保存に対応しています。他のアプリで保存済みパスワードを自動入力する機能はまだありません。'
  },
  vi: {
    title: 'Lưu mật khẩu bằng Parola – hướng dẫn thiết lập',
    teaser: 'Lưu ý: Chrome vẫn có thể dùng Google dù Parola đã được bật làm dịch vụ Android.',
    expand: 'Xem các bước thiết lập và khắc phục sự cố',
    androidTitle: '1. Chọn Parola trên Android',
    androidSteps: ['Bật tính năng tự động nhận diện mật khẩu trong phần Cài đặt của Parola.', 'Trong cài đặt Android, chọn “Password Manager: Parola” làm dịch vụ tự động điền ưu tiên.'],
    chromeTitle: '2. Chuyển Chrome sang Parola',
    chromeSteps: ['Mở Chrome → ⋮ → Cài đặt.', 'Mở “Tự động điền và mật khẩu” → “Dịch vụ tự động điền” (tên mục có thể khác).', 'Chọn “Tự động điền bằng dịch vụ khác” thay cho “Tự động điền bằng Google”.', 'Khởi động lại Chrome nếu được yêu cầu.'],
    testTitle: '3. Thử bằng tài khoản kiểm tra',
    testSteps: ['Đăng nhập vào trang web có hỗ trợ bằng thông tin giả và gửi biểu mẫu.', 'Chấp nhận lời nhắc lưu của Android. Sau đó mở Parola, kiểm tra thông tin đăng nhập đã nhận diện và lưu vào kho.'],
    troubleshootingTitle: 'Google vẫn hỏi có muốn lưu?',
    troubleshooting: 'Kiểm tra lại cài đặt dịch vụ tự động điền trong Chrome. Trình quản lý mật khẩu Google có thể hiện lời nhắc riêng. Không phải mọi ứng dụng hay trang web đều hỗ trợ tính năng Android này.',
    limitation: 'Parola hiện đề nghị lưu thông tin đăng nhập mới. Tự động điền mật khẩu đã lưu trong ứng dụng khác chưa được hỗ trợ.'
  },
  sw: {
    title: 'Hifadhi nywila kwa Parola – mwongozo',
    teaser: 'Muhimu: Chrome inaweza kuendelea kutumia Google hata kama Parola imewashwa kwenye Android.',
    expand: 'Onyesha hatua za kuweka na kutatua matatizo',
    androidTitle: '1. Chagua Parola kwenye Android',
    androidSteps: ['Washa utambuzi wa nywila kiotomatiki katika Mipangilio ya Parola.', 'Katika mipangilio ya Android, chagua “Password Manager: Parola” kama huduma kuu ya kujaza kiotomatiki.'],
    chromeTitle: '2. Badili Chrome itumie Parola',
    chromeSteps: ['Fungua Chrome → ⋮ → Mipangilio.', 'Fungua “Autofill and passwords” → “Autofill services” (majina ya menyu yanaweza kutofautiana).', 'Chagua “Autofill using another service” badala ya “Autofill with Google”.', 'Anzisha upya Chrome ukiombwa.'],
    testTitle: '3. Jaribu kwa akaunti ya majaribio',
    testSteps: ['Ingia kwenye tovuti inayotumika ukitumia taarifa bandia kisha wasilisha fomu.', 'Kubali ombi la Android la kuhifadhi. Fungua Parola, hakiki taarifa za kuingia zilizotambuliwa na uzihifadhi kwenye hifadhi yako.'],
    troubleshootingTitle: 'Google bado inaomba kuhifadhi?',
    troubleshooting: 'Kagua tena huduma ya kujaza kiotomatiki kwenye Chrome. Google Password Manager inaweza kuonyesha ombi lake la kuhifadhi. Si kila tovuti au programu inayounga mkono utambuzi wa nywila wa Android.',
    limitation: 'Parola kwa sasa inapendekeza kuhifadhi taarifa mpya za kuingia. Kujaza nywila zilizohifadhiwa katika programu nyingine bado hakupatikani.'
  },
  tr: {
    title: 'Parola ile şifre kaydetme – kurulum rehberi',
    teaser: 'Önemli: Parola Android hizmeti etkin olsa bile Chrome hâlâ Google’ı kullanabilir.',
    expand: 'Kurulum ve sorun giderme adımlarını göster',
    androidTitle: '1. Android’de Parola’yı seç',
    androidSteps: ['Parola ayarlarında otomatik şifre algılamayı etkinleştir.', 'Android ayarlarından tercih edilen otomatik doldurma hizmeti olarak “Password Manager: Parola”yı seç.'],
    chromeTitle: '2. Chrome’u Parola’ya geçir',
    chromeSteps: ['Chrome’u aç → ⋮ → Ayarlar.', '“Otomatik doldurma ve şifreler” → “Otomatik doldurma hizmetleri” bölümünü aç (menü adları farklı olabilir).', '“Google ile otomatik doldur” yerine “Başka bir hizmetle otomatik doldur” seçeneğini seç.', 'İstenirse Chrome’u yeniden başlat.'],
    testTitle: '3. Deneme hesabıyla test et',
    testSteps: ['Desteklenen bir sitede uydurma kullanıcı bilgileriyle giriş yap ve formu gönder.', 'Android’in kaydetme önerisini onayla. Ardından Parola’yı aç, algılanan girişi kontrol et ve kasaya kaydet.'],
    troubleshootingTitle: 'Google hâlâ şifre kaydetmeyi mi soruyor?',
    troubleshooting: 'Chrome’daki otomatik doldurma hizmeti ayarını yeniden kontrol et. Google Şifre Yöneticisi kendi kaydetme penceresini gösterebilir. Her uygulama veya web sitesi Android şifre algılamayı desteklemez.',
    limitation: 'Parola şu anda yeni giriş bilgilerini kaydetmeyi önerir. Diğer uygulamalarda kayıtlı şifreleri otomatik doldurma henüz yok.'
  },
  ta: {
    title: 'Parola மூலம் கடவுச்சொற்களைச் சேமிப்பது – வழிகாட்டி',
    teaser: 'முக்கியம்: Android-இல் Parola இயக்கப்பட்டிருந்தாலும் Chrome, Google-ஐப் பயன்படுத்தலாம்.',
    expand: 'அமைப்பு மற்றும் சிக்கல் தீர்க்கும் படிகளைக் காண்க',
    androidTitle: '1. Android-இல் Parola-வைத் தேர்ந்தெடுக்கவும்',
    androidSteps: ['Parola அமைப்புகளில் தானியங்கி கடவுச்சொல் கண்டறிதலை இயக்கவும்.', 'Android அமைப்புகளில் “Password Manager: Parola” என்பதை விருப்பமான தானியங்கி நிரப்பல் சேவையாகத் தேர்ந்தெடுக்கவும்.'],
    chromeTitle: '2. Chrome-ஐ Parola-க்கு மாற்றவும்',
    chromeSteps: ['Chrome → ⋮ → அமைப்புகள் என்பதற்குச் செல்லவும்.', '“Autofill and passwords” → “Autofill services” என்பதைத் திறக்கவும் (பெயர்கள் மாறலாம்).', '“Autofill with Google” என்பதற்குப் பதிலாக “Autofill using another service” என்பதைத் தேர்ந்தெடுக்கவும்.', 'கேட்கப்பட்டால் Chrome-ஐ மீண்டும் தொடங்கவும்.'],
    testTitle: '3. சோதனைக் கணக்குடன் பரிசோதிக்கவும்',
    testSteps: ['ஆதரவு உள்ள தளத்தில் கற்பனையான உள்நுழைவு விவரங்களை அளித்து படிவத்தைச் சமர்ப்பிக்கவும்.', 'Android-இன் சேமிப்பு அறிவிப்பை ஏற்கவும். பின்னர் Parola-வைத் திறந்து கண்டறிந்த உள்நுழைவைச் சரிபார்த்து பாதுகாப்புப் பெட்டகத்தில் சேமிக்கவும்.'],
    troubleshootingTitle: 'Google இன்னும் சேமிக்கச் சொல்கிறதா?',
    troubleshooting: 'Chrome-இன் தானியங்கி நிரப்பல் சேவை அமைப்பை மீண்டும் சரிபார்க்கவும். Google Password Manager தனியான சேமிப்பு அறிவிப்பைக் காட்டலாம். எல்லா தளங்களும் செயலிகளும் Android கடவுச்சொல் கண்டறிதலை ஆதரிக்காது.',
    limitation: 'Parola தற்போது புதிய உள்நுழைவுகளைச் சேமிக்க உதவுகிறது. பிற செயலிகளில் சேமித்த கடவுச்சொற்களைத் தானாக நிரப்பும் வசதி இன்னும் இல்லை.'
  },
  ko: {
    title: 'Parola로 비밀번호 저장하기 – 설정 안내',
    teaser: '중요: Android에서 Parola가 활성화되어 있어도 Chrome은 Google을 계속 사용할 수 있습니다.',
    expand: '설정 및 문제 해결 단계 보기',
    androidTitle: '1. Android에서 Parola 선택',
    androidSteps: ['Parola 설정에서 자동 비밀번호 감지를 켭니다.', 'Android 설정에서 “Password Manager: Parola”를 기본 자동 완성 서비스로 선택합니다.'],
    chromeTitle: '2. Chrome을 Parola로 전환',
    chromeSteps: ['Chrome을 열고 ⋮ → 설정으로 이동합니다.', '“자동 완성 및 비밀번호” → “자동 완성 서비스”로 이동합니다(메뉴 이름은 다를 수 있습니다).', '“Google로 자동 완성” 대신 “다른 서비스로 자동 완성”을 선택합니다.', '요청이 표시되면 Chrome을 다시 시작합니다.'],
    testTitle: '3. 테스트 계정으로 확인',
    testSteps: ['지원되는 사이트에서 가상의 로그인 정보를 입력하고 양식을 제출합니다.', 'Android의 저장 제안을 승인합니다. Parola를 열고 감지된 로그인을 확인한 다음 보관함에 저장합니다.'],
    troubleshootingTitle: 'Google이 계속 저장하라고 하나요?',
    troubleshooting: 'Chrome의 자동 완성 서비스 설정을 다시 확인하세요. Google 비밀번호 관리자가 자체 저장 창을 표시할 수도 있습니다. 모든 앱과 사이트가 Android 비밀번호 감지를 지원하지는 않습니다.',
    limitation: 'Parola는 현재 새 로그인 정보를 저장하도록 제안합니다. 다른 앱에서 기존 비밀번호를 자동 입력하는 기능은 아직 제공되지 않습니다.'
  },
  fa: {
    title: 'ذخیره گذرواژه با Parola – راهنمای راه‌اندازی',
    teaser: 'مهم: حتی با فعال بودن Parola در Android، ممکن است Chrome همچنان از Google استفاده کند.',
    expand: 'نمایش مراحل راه‌اندازی و رفع مشکل',
    androidTitle: '۱. انتخاب Parola در Android',
    androidSteps: ['تشخیص خودکار گذرواژه را در تنظیمات Parola فعال کنید.', 'در تنظیمات Android، «Password Manager: Parola» را به‌عنوان سرویس تکمیل خودکار پیش‌فرض انتخاب کنید.'],
    chromeTitle: '۲. تغییر سرویس Chrome به Parola',
    chromeSteps: ['Chrome را باز کنید ← ⋮ ← تنظیمات.', '«تکمیل خودکار و گذرواژه‌ها» ← «سرویس‌های تکمیل خودکار» را باز کنید (نام منوها ممکن است متفاوت باشد).', 'به‌جای «تکمیل خودکار با Google»، گزینهٔ «تکمیل خودکار با سرویس دیگر» را انتخاب کنید.', 'اگر درخواست شد Chrome را دوباره راه‌اندازی کنید.'],
    testTitle: '۳. آزمایش با حساب ساختگی',
    testSteps: ['در سایتی سازگار با اطلاعات ورود ساختگی وارد شوید و فرم را ارسال کنید.', 'پیشنهاد ذخیرهٔ Android را تأیید کنید. سپس Parola را باز کرده، ورود شناسایی‌شده را بررسی و در خزانه ذخیره کنید.'],
    troubleshootingTitle: 'هنوز Google پیشنهاد ذخیره می‌دهد؟',
    troubleshooting: 'تنظیم سرویس تکمیل خودکار Chrome را دوباره بررسی کنید. Google Password Manager ممکن است پیام ذخیرهٔ جداگانه نشان دهد. همهٔ سایت‌ها و برنامه‌ها از تشخیص گذرواژهٔ Android پشتیبانی نمی‌کنند.',
    limitation: 'Parola فعلاً ذخیرهٔ اطلاعات ورود جدید را پیشنهاد می‌دهد. تکمیل خودکار گذرواژه‌های ذخیره‌شده در برنامه‌های دیگر هنوز در دسترس نیست.'
  },
  th: {
    title: 'บันทึกรหัสผ่านด้วย Parola – คู่มือการตั้งค่า',
    teaser: 'สำคัญ: Chrome อาจยังใช้ Google แม้จะเปิดใช้ Parola เป็นบริการ Android แล้ว',
    expand: 'ดูขั้นตอนการตั้งค่าและแก้ปัญหา',
    androidTitle: '1. เลือก Parola ใน Android',
    androidSteps: ['เปิดการตรวจจับรหัสผ่านอัตโนมัติในการตั้งค่า Parola', 'ในการตั้งค่า Android ให้เลือก “Password Manager: Parola” เป็นบริการป้อนข้อมูลอัตโนมัติหลัก'],
    chromeTitle: '2. เปลี่ยน Chrome ให้ใช้ Parola',
    chromeSteps: ['เปิด Chrome → ⋮ → การตั้งค่า', 'เปิด “การป้อนอัตโนมัติและรหัสผ่าน” → “บริการป้อนอัตโนมัติ” (ชื่อเมนูอาจต่างกัน)', 'เลือก “ป้อนอัตโนมัติด้วยบริการอื่น” แทน “ป้อนอัตโนมัติด้วย Google”', 'รีสตาร์ต Chrome หากมีข้อความแจ้ง'],
    testTitle: '3. ทดสอบด้วยบัญชีทดลอง',
    testSteps: ['ลงชื่อเข้าใช้เว็บไซต์ที่รองรับด้วยข้อมูลสมมติ แล้วส่งแบบฟอร์ม', 'ยอมรับคำแนะนำให้บันทึกจาก Android จากนั้นเปิด Parola ตรวจสอบข้อมูลเข้าสู่ระบบที่พบ แล้วบันทึกลงในคลัง'],
    troubleshootingTitle: 'Google ยังถามให้บันทึกรหัสผ่านอยู่หรือไม่?',
    troubleshooting: 'ตรวจสอบการตั้งค่าบริการป้อนอัตโนมัติของ Chrome อีกครั้ง Google Password Manager อาจแสดงคำถามให้บันทึกของตนเอง ไม่ใช่ทุกเว็บไซต์หรือแอปที่รองรับการตรวจจับรหัสผ่านของ Android',
    limitation: 'ขณะนี้ Parola เสนอให้บันทึกข้อมูลเข้าสู่ระบบใหม่ แต่ยังไม่สามารถป้อนรหัสผ่านที่บันทึกไว้ในแอปอื่นโดยอัตโนมัติ'
  }
};

export function autofillGuide(language: AppLanguage): AutofillGuideText {
  return AUTOFILL_GUIDES[language];
}
