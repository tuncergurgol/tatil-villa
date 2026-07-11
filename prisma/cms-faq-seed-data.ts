export type FaqSeedItem = {
  question: string;
  answer: string;
  category: string;
  slug: string;
};

export const villaRentalFaqSeedData: FaqSeedItem[] = [
  // genel (7)
  {
    question: "Villa kiralama nedir ve otel konaklamasından farkı nedir?",
    answer:
      "Villa kiralama, tatil süresince tamamen size ait özel bir konutu kısa dönemli olarak kullanmanızı sağlayan konaklama modelidir. Otellerden farklı olarak mutfak, salon, bahçe ve havuz gibi alanlar yalnızca sizin grubunuzun kullanımına açıktır. Bu sayede daha fazla mahremiyet, esnek saatler ve aile ya da arkadaş grupları için ekonomik bir alternatif sunar.",
    category: "genel",
    slug: "villa-kiralama-nedir",
  },
  {
    question: "Türkiye'de villa kiralama kimler için uygundur?",
    answer:
      "Villa kiralama; aileler, çiftler, arkadaş grupları ve iş seyahati sonrası dinlenmek isteyen misafirler için idealdir. Çocuklu aileler geniş yaşam alanı ve güvenli bahçe avantajından yararlanırken, gruplar kişi başı maliyeti düşürerek daha konforlu bir tatil geçirebilir. Özel havuz, barbekü alanı ve tam donanımlı mutfak gibi olanaklar farklı ihtiyaçlara cevap verir.",
    category: "genel",
    slug: "villa-kiralama-kimler-icin",
  },
  {
    question: "Villa kiralarken kapasite ve oda sayısı nasıl belirlenir?",
    answer:
      "Her villanın ilan sayfasında maksimum misafir kapasitesi ve yatak odası sayısı açıkça belirtilir. Kapasite, yatak düzenine ve ek yatak imkânlarına göre hesaplanır; belirtilen sayının üzerinde konaklama kabul edilmez. Rezervasyon öncesinde grubunuzun büyüklüğünü ve çocuk yaşlarını kontrol ederek doğru villayı seçmeniz önemlidir.",
    category: "genel",
    slug: "villa-kapasite-oda-sayisi",
  },
  {
    question: "Villa ilanlarında yer alan olanaklar ne anlama gelir?",
    answer:
      "İlanlarda klima, Wi-Fi, çamaşır makinesi, bulaşık makinesi, televizyon, barbekü, otopark ve deniz manzarası gibi olanaklar simgelerle gösterilir. Bazı villalarda jakuzi, sauna, bilardo veya çocuk oyun alanı gibi ekstra özellikler bulunabilir. Rezervasyon öncesi ihtiyaç duyduğunuz tüm olanakların ilanda listelendiğinden emin olun.",
    category: "genel",
    slug: "villa-olanaklari-ne-anlama-gelir",
  },
  {
    question: "Villa kiralama sözleşmesi neden önemlidir?",
    answer:
      "Kiralama sözleşmesi; konaklama tarihleri, ödeme koşulları, depozito, iptal şartları ve tarafların haklarını yazılı olarak güvence altına alır. Rezervasyon onayı sonrası tarafınıza iletilen sözleşmeyi dikkatlice okumanız önerilir. Sözleşme, olası anlaşmazlıklarda her iki taraf için de referans belge niteliği taşır.",
    category: "genel",
    slug: "villa-kiralama-sozlesmesi",
  },
  {
    question: "Villa kiralama platformları güvenilir midir?",
    answer:
      "Güvenilir platformlar villa sahiplerini ve ilanları doğrulayarak misafirlere şeffaf bilgi sunar. TÜRSAB belgeli acenteler, müşteri yorumları ve detaylı ilan açıklamaları güvenilirlik göstergeleridir. Rezervasyon yapmadan önce firmanın yasal belgelerini ve iletişim kanallarını kontrol etmeniz tavsiye edilir.",
    category: "genel",
    slug: "villa-kiralama-platformlari-guvenilir-mi",
  },
  {
    question: "Villa tatili için en uygun sezon hangisidir?",
    answer:
      "Haziran, temmuz ve ağustos ayları en yoğun ve sıcak dönemdir; erken rezervasyon bu aylar için şarttır. Mayıs ve eylül ayları daha sakin bir tatil ve uygun fiyatlar sunar. Kış aylarında ısıtmalı havuzlu villalar tercih edilerek yıl boyunca villa tatili yapılabilir.",
    category: "genel",
    slug: "villa-tatili-en-uygun-sezon",
  },

  // rezervasyon (7)
  {
    question: "Villa rezervasyonu nasıl yapılır?",
    answer:
      "Beğendiğiniz villanın ilan sayfasından tarih seçerek müsaitlik kontrolü yapabilirsiniz. Online formu doldurduktan sonra ön rezervasyon talebiniz acenteye iletilir ve onay süreci başlar. Onay sonrası sözleşme ve ödeme bilgileri e-posta veya WhatsApp üzerinden tarafınıza gönderilir.",
    category: "rezervasyon",
    slug: "villa-rezervasyonu-nasil-yapilir",
  },
  {
    question: "Erken rezervasyon avantajları nelerdir?",
    answer:
      "Erken rezervasyon yaparak yaz sezonunda istediğiniz villayı garanti altına alabilirsiniz. Birçok acente erken rezervasyon kampanyalarıyla indirimli fiyatlar sunar. Popüler bölgelerdeki villalar sezon başlamadan önce dolduğundan en az 3-6 ay öncesinden planlama yapmanız önerilir.",
    category: "rezervasyon",
    slug: "erken-rezervasyon-avantajlari",
  },
  {
    question: "Son dakika villa rezervasyonu mümkün mü?",
    answer:
      "Müsait villalar için son dakika rezervasyonu yapılabilir; ancak seçenekler sınırlı olabilir. Bazı acenteler kalan tarihler için özel indirimli fiyatlar sunar. Son dakika rezervasyonlarında ödeme ve onay sürecinin hızlı tamamlanması gerekir.",
    category: "rezervasyon",
    slug: "son-dakika-villa-rezervasyonu",
  },
  {
    question: "Grup rezervasyonu nasıl yapılır?",
    answer:
      "Kalabalık gruplar için kapasitesi yüksek villalar tercih edilmelidir. Grup rezervasyonlarında özel fiyat teklifi almak için doğrudan acente ile iletişime geçebilirsiniz. Tüm misafir isimlerinin ve iletişim bilgilerinin rezervasyon sırasında paylaşılması check-in sürecini hızlandırır.",
    category: "rezervasyon",
    slug: "grup-rezervasyonu-nasil-yapilir",
  },
  {
    question: "Rezervasyon onayı ne kadar sürede gelir?",
    answer:
      "Online talepler genellikle aynı gün içinde değerlendirilir ve 24 saat içinde yanıtlanır. Yoğun sezonlarda bu süre biraz uzayabilir. Onay e-postası veya mesajı aldıktan sonra belirtilen sürede ödeme yapmanız rezervasyonun kesinleşmesi için gereklidir.",
    category: "rezervasyon",
    slug: "rezervasyon-onay-suresi",
  },
  {
    question: "Rezervasyon tarihlerini değiştirebilir miyim?",
    answer:
      "Tarih değişikliği talepleri villanın müsaitlik durumuna ve iptal politikasına bağlıdır. Değişiklik mümkünse fiyat farkı oluşabilir veya ek ücret talep edilebilir. Tarih değişikliği için en kısa sürede acente ile iletişime geçmeniz önerilir.",
    category: "rezervasyon",
    slug: "rezervasyon-tarih-degisikligi",
  },
  {
    question: "Rezervasyon için hangi bilgiler gereklidir?",
    answer:
      "Rezervasyon sırasında ad-soyad, iletişim telefonu, e-posta adresi ve konaklayacak misafir sayısı istenir. Kimlik bilgileri check-in sırasında talep edilebilir. Yurt dışından gelen misafirler için pasaport bilgisi de gerekebilir.",
    category: "rezervasyon",
    slug: "rezervasyon-gerekli-bilgiler",
  },

  // odeme (7)
  {
    question: "Villa kiralama ödemesi nasıl yapılır?",
    answer:
      "Ön ödeme genellikle toplam tutarın belirli bir yüzdesi olarak banka havalesi veya EFT ile alınır. Kalan tutar check-in öncesi veya giriş günü ödenebilir; koşullar villaya göre değişir. Kredi kartı ile ödeme imkânı sunan acenteler de mevcuttur.",
    category: "odeme",
    slug: "villa-kiralama-odemesi-nasil-yapilir",
  },
  {
    question: "Depozito nedir ve ne zaman iade edilir?",
    answer:
      "Depozito, villada oluşabilecek hasarlara karşılık giriş sırasında alınan güvence bedelidir. Hasar olmaması halinde check-out sonrası genellikle 3-7 iş günü içinde iade edilir. Depozito tutarı ve iade koşulları sözleşmede açıkça belirtilir.",
    category: "odeme",
    slug: "depozito-nedir-ne-zaman-iade",
  },
  {
    question: "Villa kiralama fiyatına neler dahildir?",
    answer:
      "Standart fiyata genellikle villanın kullanımı, elektrik, su, tüpgaz ve temizlik ücreti dahildir. Havuz ısıtma, ekstra temizlik, havaalanı transferi ve bebek yatağı gibi hizmetler ek ücrete tabi olabilir. İlan sayfasındaki fiyat detaylarını inceleyerek sürpriz maliyetlerden kaçınabilirsiniz.",
    category: "odeme",
    slug: "villa-fiyatina-neler-dahil",
  },
  {
    question: "Taksitli ödeme seçeneği var mı?",
    answer:
      "Bazı acenteler kredi kartı ile taksitli ödeme imkânı sunar. Taksit sayısı ve komisyon oranları banka ve acente anlaşmasına göre değişir. Taksit seçenekleri hakkında rezervasyon öncesi acentenize danışabilirsiniz.",
    category: "odeme",
    slug: "taksitli-odeme-secenegi",
  },
  {
    question: "Fatura veya makbuz alabilir miyim?",
    answer:
      "Tüm ödemeler için yasal fatura veya makbuz düzenlenir. Kurumsal rezervasyonlarda şirket unvanına fatura kesilmesi mümkündür. Fatura talebinizi rezervasyon sırasında veya ödeme öncesinde belirtmeniz yeterlidir.",
    category: "odeme",
    slug: "fatura-makbuz-alabilir-miyim",
  },
  {
    question: "Döviz cinsinden ödeme yapılabilir mi?",
    answer:
      "Yurt dışından gelen misafirler için Euro veya İngiliz Sterlini cinsinden ödeme kabul eden acenteler bulunmaktadır. Güncel kur üzerinden hesaplama yapılır. Döviz ödeme seçenekleri için rezervasyon öncesi acente ile görüşmeniz önerilir.",
    category: "odeme",
    slug: "doviz-cinsinden-odeme",
  },
  {
    question: "Ödeme yapmadan rezervasyon iptal olur mu?",
    answer:
      "Ön rezervasyon onayı sonrası belirtilen sürede ödeme yapılmazsa rezervasyon otomatik olarak iptal edilebilir. Ödeme süresi sözleşmede veya onay e-postasında belirtilir. Kesin rezervasyon için ödemenin zamanında tamamlanması şarttır.",
    category: "odeme",
    slug: "odeme-yapmadan-rezervasyon-iptal",
  },

  // villa-konaklama (7)
  {
    question: "Check-in ve check-out saatleri nedir?",
    answer:
      "Standart check-in saati genellikle 16:00, check-out saati ise 10:00 civarındadır. Erken giriş veya geç çıkış talepleri villanın müsaitlik durumuna göre değerlendirilir. Kesin saatler rezervasyon onayında ve giriş bilgilerinde belirtilir.",
    category: "villa-konaklama",
    slug: "check-in-check-out-saatleri",
  },
  {
    question: "Villaya evcil hayvan getirilebilir mi?",
    answer:
      "Evcil hayvan kabulü villa bazında değişir; ilan sayfasında belirtilen pet-friendly villalar bu konuda esneklik sunar. Kabul edilen villalarda genellikle ek temizlik ücreti talep edilir. Rezervasyon öncesi evcil hayvan politikasını mutlaka kontrol edin.",
    category: "villa-konaklama",
    slug: "evcil-hayvan-getirilebilir-mi",
  },
  {
    question: "Havuz ısıtma hizmeti nasıl çalışır?",
    answer:
      "Havuz ısıtma özelliği tüm villalarda standart değildir; ısıtmalı havuzlu villalar ilanlarda ayrıca belirtilir. Isıtma hizmeti genellikle günlük veya haftalık ek ücrete tabidir. Kış ve ilkbahar aylarında konforlu yüzme için ısıtmalı havuz tercih edilebilir.",
    category: "villa-konaklama",
    slug: "havuz-isitma-hizmeti",
  },
  {
    question: "Villa temizliği nasıl yapılır?",
    answer:
      "Giriş öncesi villa profesyonel ekipler tarafından temizlenir ve hazırlanır. Uzun konaklamalarda ara temizlik hizmeti ek ücret karşılığında talep edilebilir. Çıkış günü villanın düzenli bırakılması depozito iadesi açısından önemlidir.",
    category: "villa-konaklama",
    slug: "villa-temizligi-nasil-yapilir",
  },
  {
    question: "Villada kaç kişi konaklayabilir?",
    answer:
      "Her villanın maksimum konaklama kapasitesi ilan sayfasında açıkça yazılır. Belirtilen kapasitenin üzerinde misafir kabul edilmez ve ek kişi talepleri ek ücrete tabi olabilir. Bebekler için yaş sınırı villaya göre farklılık gösterebilir.",
    category: "villa-konaklama",
    slug: "villada-kac-kisi-konaklayabilir",
  },
  {
    question: "Villada yemek hizmeti veya şef bulunur mu?",
    answer:
      "Çoğu villa tam donanımlı mutfakla kiralanır ve yemek misafirler tarafından hazırlanır. Bazı premium villalarda şef hizmeti veya kahvaltı paketi ek ücretle sunulabilir. Yakındaki restoran ve market bilgileri giriş sırasında paylaşılır.",
    category: "villa-konaklama",
    slug: "villada-yemek-hizmeti-sef",
  },
  {
    question: "Villada internet ve çalışma imkânı var mı?",
    answer:
      "Birçok villa yüksek hızlı Wi-Fi ile donatılmıştır ve uzaktan çalışma için uygundur. İnternet hızı ve kapsama alanı ilan detaylarında belirtilir. Kesintisiz bağlantı ihtiyacınız varsa rezervasyon öncesi acentenize danışabilirsiniz.",
    category: "villa-konaklama",
    slug: "villada-internet-calisma-imkani",
  },

  // iptal-iade (7)
  {
    question: "Villa rezervasyonu iptal koşulları nelerdir?",
    answer:
      "İptal koşulları her villanın ve acentenin politikasına göre farklılık gösterir. Genellikle konaklamaya kalan süreye bağlı olarak kademeli iade veya kesinti uygulanır. İptal şartları rezervasyon sözleşmesinde ve ilan sayfasında detaylı olarak yer alır.",
    category: "iptal-iade",
    slug: "villa-rezervasyon-iptal-kosullari",
  },
  {
    question: "Erken iptal durumunda ne kadar iade alırım?",
    answer:
      "Konaklamaya 60 gün ve üzeri kala yapılan iptallerde genellikle ön ödemenin tamamı iade edilir. 30-60 gün arası iptallerde kısmi kesinti uygulanabilir. 30 günden az kalan iptallerde iade yapılmayabilir; kesin koşullar sözleşmede belirtilir.",
    category: "iptal-iade",
    slug: "erken-iptal-iade-miktari",
  },
  {
    question: "Force majeure durumunda iptal hakkım var mı?",
    answer:
      "Doğal afet, salgın hastalık veya resmi seyahat kısıtlaması gibi mücbir sebeplerde özel iptal koşulları uygulanabilir. Bu durumlarda acente ile iletişime geçerek tarih değişikliği veya kredi notu talep edebilirsiniz. Her durum ayrı değerlendirilir.",
    category: "iptal-iade",
    slug: "force-majeure-iptal-hakki",
  },
  {
    question: "Depozito iadesi ne zaman yapılır?",
    answer:
      "Check-out sonrası villa kontrol edilir ve hasar tespit edilmezse depozito iade süreci başlar. İade genellikle 3-7 iş günü içinde banka hesabınıza aktarılır. Hasar durumunda onarım maliyeti depozitodan mahsup edilir ve kalan tutar iade edilir.",
    category: "iptal-iade",
    slug: "depozito-iadesi-ne-zaman",
  },
  {
    question: "Rezervasyonu başka birine devredebilir miyim?",
    answer:
      "Bazı acenteler rezervasyon devrini belirli koşullarla kabul eder. Devir talebi en az 14 gün öncesinde yapılmalı ve yeni misafir bilgileri paylaşılmalıdır. Devir işlemi için acente onayı ve olası işlem ücreti gerekebilir.",
    category: "iptal-iade",
    slug: "rezervasyon-devri-mumkun-mu",
  },
  {
    question: "Ödeme iadesi hangi yöntemle yapılır?",
    answer:
      "İadeler genellikle ödemenin yapıldığı hesaba veya kredi kartına geri aktarılır. Banka havalesi ile yapılan ödemelerde iade süresi bankanın işlem süresine bağlı olarak değişebilir. İade süreci hakkında acentenizden takip bilgisi alabilirsiniz.",
    category: "iptal-iade",
    slug: "odeme-iadesi-hangi-yontemle",
  },
  {
    question: "No-show durumunda ne olur?",
    answer:
      "Rezervasyon tarihinde villaya gelmemek ve önceden iptal etmemek no-show olarak değerlendirilir. Bu durumda ödenen tutarın tamamı veya büyük kısmı iade edilmeyebilir. Seyahat planınızda değişiklik olursa derhal acente ile iletişime geçmeniz önemlidir.",
    category: "iptal-iade",
    slug: "no-show-durumunda-ne-olur",
  },

  // bolge-tatil (8)
  {
    question: "Fethiye'de villa kiralama neden tercih edilir?",
    answer:
      "Fethiye, Ölüdeniz, Kalkan ve Kayaköy gibi popüler destinasyonlara yakınlığıyla öne çıkar. Doğa yürüyüşleri, tekne turları ve antik kent ziyaretleri için ideal bir konum sunar. Hem deniz hem doğa tatili isteyenler için geniş villa seçenekleri mevcuttur.",
    category: "bolge-tatil",
    slug: "fethiye-villa-kiralama",
  },
  {
    question: "Kalkan'da villa tatili nasıl bir deneyim sunar?",
    answer:
      "Kalkan, butik atmosferi ve muhteşem deniz manzaralarıyla lüks villa tatilinin merkezidir. Taş ev mimarisi ve teraslı villalar bölgenin karakteristik özelliklerindendir. Kalkan merkeze ve plajlara yakın villalar yürüme mesafesinde konaklama imkânı sağlar.",
    category: "bolge-tatil",
    slug: "kalkan-villa-tatili",
  },
  {
    question: "Bodrum'da villa kiralama seçenekleri nelerdir?",
    answer:
      "Bodrum yarımadası; Yalıkavak, Türkbükü, Gümüşlük ve Bitez gibi farklı karakterde bölgeler sunar. Marina yakınındaki villalar yat sahipleri için idealdir. Canlı gece hayatı ve sakin koylar bir arada yaşanabilecek çeşitli konumlar mevcuttur.",
    category: "bolge-tatil",
    slug: "bodrum-villa-kiralama-secenekleri",
  },
  {
    question: "Çeşme ve Alaçatı'da villa tatili yapılabilir mi?",
    answer:
      "Çeşme ve Alaçatı, rüzgar sörfü ve plaj kültürüyle Ege'nin en popüler villa tatil bölgelerindendir. Taş villalar ve modern mimarili konutlar geniş bir yelpazede sunulur. Termal kaplıcalar ve sakız adası feribotu gibi ek aktiviteler tatili zenginleştirir.",
    category: "bolge-tatil",
    slug: "cesme-alacati-villa-tatili",
  },
  {
    question: "Denize yakın villa nasıl seçilir?",
    answer:
      "İlanlarda denize uzaklık metre cinsinden veya yürüme süresi olarak belirtilir. Deniz manzaralı, denize sıfır veya özel plajlı villa seçenekleri farklı fiyat aralıklarında sunulur. Harita üzerinden konumu kontrol ederek beklentinize uygun villayı seçebilirsiniz.",
    category: "bolge-tatil",
    slug: "denize-yakin-villa-nasil-secilir",
  },
  {
    question: "Villa tatili için havaalanı transferi var mı?",
    answer:
      "Dalaman, Milas-Bodrum ve İzmir havaalanlarından villa bölgelerine transfer hizmeti sunulmaktadır. Transfer ücreti genellikle ek hizmet olarak faturalandırılır. Rezervasyon sırasında uçuş bilgilerinizi paylaşarak transfer ayarlayabilirsiniz.",
    category: "bolge-tatil",
    slug: "havaalani-transferi-var-mi",
  },
  {
    question: "Villa tatilinde araç kiralama gerekli mi?",
    answer:
      "Birçok villa merkeze veya plaja yürüme mesafesindedir; ancak bölgeyi keşfetmek için araç kiralama önerilir. Acenteler aracılığıyla araç kiralama hizmeti de temin edilebilir. Villa otopark imkânı ilan detaylarında belirtilir.",
    category: "bolge-tatil",
    slug: "villa-tatilinde-arac-kiralama",
  },
  {
    question: "Hangi bölgede ısıtmalı havuzlu villa bulunur?",
    answer:
      "Kış ve ilkbahar aylarında Fethiye, Kalkan ve Kaş bölgelerinde ısıtmalı havuzlu villa seçenekleri yaygındır. Isıtmalı havuz özelliği ilan filtrelerinde ayrı bir kategori olarak listelenir. Serin akşamlarda da havuz keyfi yapmak isteyenler için ideal bir seçenektir.",
    category: "bolge-tatil",
    slug: "isitmali-havuzlu-villa-bolgeleri",
  },

  // guvenlik (7)
  {
    question: "TÜRSAB belgesi villa kiralamada neden önemlidir?",
    answer:
      "TÜRSAB (Türkiye Seyahat Acentaları Birliği) belgesi, acentenin yasal olarak faaliyet gösterdiğini kanıtlar. Belgesiz firmalarla çalışmak mali ve hukuki risk taşır. Rezervasyon öncesi acentenin TÜRSAB belge numarasını kontrol etmeniz güvenliğiniz için önemlidir.",
    category: "guvenlik",
    slug: "tursab-belgesi-neden-onemli",
  },
  {
    question: "Villa kiralama güvenliği nasıl sağlanır?",
    answer:
      "Güvenilir acenteler villaları düzenli olarak denetler ve misafir geri bildirimlerini değerlendirir. Giriş sırasında villa anahtarları ve acil iletişim numaraları paylaşılır. 7/24 destek hattı sunan acenteler konaklama süresince yanınızdadır.",
    category: "guvenlik",
    slug: "villa-kiralama-guvenligi",
  },
  {
    question: "Villada güvenlik kamerası var mı?",
    answer:
      "Misafir mahremiyetini korumak amacıyla villaların iç mekânlarında kamera bulunmaz. Giriş kapısı veya dış bahçe gibi ortak alanlarda güvenlik kamerası olabilir; bu durum ilanda belirtilir. Kamera olan villalarda konaklama alanları kapsam dışı bırakılır.",
    category: "guvenlik",
    slug: "villada-guvenlik-kamerasi",
  },
  {
    question: "Çocuklu aileler için villa güvenliği nasıldır?",
    answer:
      "Çocuk dostu villalarda havuz bariyeri, güvenli merdiven korkulukları ve çocuk oyun alanı bulunabilir. Bebek yatağı ve mama sandalyesi talep üzerine temin edilir. Rezervasyon öncesi çocuk güvenliği özelliklerini ilan sayfasından kontrol edin.",
    category: "guvenlik",
    slug: "cocuklu-aileler-villa-guvenligi",
  },
  {
    question: "Villa kiralama sigortası var mı?",
    answer:
      "Bazı acenteler konaklama sigortası veya iptal sigortası seçeneği sunar. Bu sigorta, beklenmedik iptal veya sağlık sorunlarında mali kaybınızı azaltır. Sigorta kapsamı ve prim tutarı rezervasyon sırasında detaylandırılır.",
    category: "guvenlik",
    slug: "villa-kiralama-sigortasi",
  },
  {
    question: "Acil durumlarda kime ulaşmalıyım?",
    answer:
      "Rezervasyon onayında acente acil destek hattı ve bölge sorumlusu iletişim bilgileri paylaşılır. Elektrik, su veya teknik arıza durumlarında 7/24 ulaşılabilir destek sağlanır. Acil sağlık durumları için en yakın hastane bilgisi de giriş dosyasında yer alır.",
    category: "guvenlik",
    slug: "acil-durumlarda-kime-ulasilir",
  },
  {
    question: "Kişisel verilerim güvende mi?",
    answer:
      "KVKK kapsamında kişisel verileriniz yalnızca rezervasyon ve konaklama hizmeti için kullanılır. Verileriniz üçüncü taraflarla izinsiz paylaşılmaz. Gizlilik politikamız web sitemizde detaylı olarak yayınlanmaktadır.",
    category: "guvenlik",
    slug: "kisisel-veriler-guvende-mi",
  },
];
