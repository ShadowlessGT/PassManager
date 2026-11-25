import type { AppLanguage } from './i18n';

// Every supported Parola locale has its own complete recommendation UI.
export const RECOMMEND_TEXT: Record<AppLanguage, readonly [string,string,string,string,string,string,string]> = {
  de: ['Parola weiterempfehlen','Scanne den QR-Code mit deiner Smartphone-Kamera, um Parola bei Google Play herunterzuladen.','App teilen','Google Play öffnen','Schließen','App-Link wurde kopiert.','Aktion nicht verfügbar. Bitte versuche es erneut.'],
  en: ['Recommend Parola','Scan the QR code with your phone camera to download Parola from Google Play.','Share app','Open Google Play','Close','App link copied.','Action unavailable. Please try again.'],
  'zh-Hans': ['推荐 Parola','使用手机摄像头扫描二维码，即可从 Google Play 下载 Parola。','分享应用','打开 Google Play','关闭','应用链接已复制。','操作不可用，请重试。'],
  hi: ['Parola की सिफारिश करें','Google Play से Parola डाउनलोड करने के लिए अपने फ़ोन के कैमरे से QR कोड स्कैन करें।','ऐप साझा करें','Google Play खोलें','बंद करें','ऐप लिंक कॉपी हो गया।','कार्रवाई उपलब्ध नहीं है। फिर से कोशिश करें।'],
  es: ['Recomienda Parola','Escanea el código QR con la cámara de tu teléfono para descargar Parola desde Google Play.','Compartir app','Abrir Google Play','Cerrar','Enlace copiado.','Acción no disponible. Inténtalo de nuevo.'],
  ar: ['أوصِ بتطبيق Parola','امسح رمز QR بكاميرا هاتفك لتنزيل Parola من Google Play.','مشاركة التطبيق','فتح Google Play','إغلاق','تم نسخ رابط التطبيق.','الإجراء غير متاح. حاول مجددًا.'],
  fr: ['Recommander Parola','Scannez le code QR avec votre téléphone pour télécharger Parola sur Google Play.','Partager l’application','Ouvrir Google Play','Fermer','Lien copié.','Action indisponible. Réessayez.'],
  bn: ['Parola সুপারিশ করুন','Google Play থেকে Parola ডাউনলোড করতে ফোনের ক্যামেরা দিয়ে QR কোড স্ক্যান করুন।','অ্যাপ শেয়ার করুন','Google Play খুলুন','বন্ধ করুন','অ্যাপের লিংক কপি হয়েছে।','কাজটি করা যাচ্ছে না। আবার চেষ্টা করুন।'],
  pt: ['Recomende o Parola','Escaneie o código QR com a câmera do celular para baixar o Parola no Google Play.','Compartilhar app','Abrir Google Play','Fechar','Link do app copiado.','Ação indisponível. Tente novamente.'],
  id: ['Rekomendasikan Parola','Pindai kode QR dengan kamera ponsel untuk mengunduh Parola dari Google Play.','Bagikan aplikasi','Buka Google Play','Tutup','Tautan aplikasi disalin.','Tindakan tidak tersedia. Coba lagi.'],
  ur: ['Parola کی سفارش کریں','Google Play سے Parola ڈاؤن لوڈ کرنے کے لیے اپنے فون کے کیمرے سے QR کوڈ اسکین کریں۔','ایپ شیئر کریں','Google Play کھولیں','بند کریں','ایپ کا لنک کاپی ہو گیا۔','یہ عمل دستیاب نہیں۔ دوبارہ کوشش کریں۔'],
  ru: ['Рекомендуйте Parola','Отсканируйте QR-код камерой телефона, чтобы скачать Parola из Google Play.','Поделиться приложением','Открыть Google Play','Закрыть','Ссылка скопирована.','Действие недоступно. Попробуйте снова.'],
  ja: ['Parola をおすすめする','スマートフォンのカメラで QR コードを読み取り、Google Play から Parola をダウンロードしてください。','アプリを共有','Google Play を開く','閉じる','アプリのリンクをコピーしました。','操作できません。もう一度お試しください。'],
  vi: ['Giới thiệu Parola','Quét mã QR bằng camera điện thoại để tải Parola từ Google Play.','Chia sẻ ứng dụng','Mở Google Play','Đóng','Đã sao chép liên kết ứng dụng.','Không thể thực hiện. Vui lòng thử lại.'],
  sw: ['Pendekeza Parola','Changanua msimbo wa QR kwa kamera ya simu ili kupakua Parola kutoka Google Play.','Shiriki programu','Fungua Google Play','Funga','Kiungo cha programu kimenakiliwa.','Kitendo hakipatikani. Jaribu tena.'],
  tr: ['Parola’yı öner','Parola’yı Google Play’den indirmek için telefonunun kamerasıyla QR kodunu okut.','Uygulamayı paylaş','Google Play’i aç','Kapat','Uygulama bağlantısı kopyalandı.','İşlem kullanılamıyor. Tekrar dene.'],
  ta: ['Parola-வைப் பரிந்துரைக்கவும்','Google Play-லிருந்து Parola-வைப் பதிவிறக்க உங்கள் கைப்பேசிக் கேமராவால் QR குறியீட்டை ஸ்கேன் செய்யவும்.','செயலியைப் பகிரவும்','Google Play-ஐத் திறக்கவும்','மூடு','செயலி இணைப்பு நகலெடுக்கப்பட்டது.','செயல் கிடைக்கவில்லை. மீண்டும் முயலவும்.'],
  ko: ['Parola 추천하기','휴대전화 카메라로 QR 코드를 스캔하여 Google Play에서 Parola를 다운로드하세요.','앱 공유','Google Play 열기','닫기','앱 링크가 복사되었습니다.','실행할 수 없습니다. 다시 시도하세요.'],
  fa: ['Parola را معرفی کنید','برای دانلود Parola از Google Play، کد QR را با دوربین گوشی اسکن کنید.','اشتراک‌گذاری برنامه','باز کردن Google Play','بستن','پیوند برنامه کپی شد.','این عملیات در دسترس نیست. دوباره تلاش کنید.'],
  th: ['แนะนำ Parola','สแกนคิวอาร์โค้ดด้วยกล้องโทรศัพท์เพื่อดาวน์โหลด Parola จาก Google Play','แชร์แอป','เปิด Google Play','ปิด','คัดลอกลิงก์แอปแล้ว','ไม่สามารถดำเนินการได้ โปรดลองอีกครั้ง']
};
