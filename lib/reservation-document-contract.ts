import { getPublishedCmsPage } from "@/lib/queries/cms-content";

export const RESERVATION_CONTRACT_SLUG = "online-rezervasyon-sozlesmesi";

/** CMS yoksa veya boşsa örnek belgedeki sözleşme gövdesi (placeholder’lı). */
export const FALLBACK_ONLINE_RESERVATION_CONTRACT = `İşbu Online Rezervasyon ve Kiralama sözleşmesi ("sözleşme") internet ortamında hazırlanmış ve imzalanmış olup sözleşmenin tarafları;
www.tatildeyiz.com.tr isimli web adresli internet sitesinin işletmecisi olup Türkiye Cumhuriyeti kanunlarına göre usule uygun olarak kurulmuş Girmeler Mahallesi Nacaklar Sokak No:8/1 D:3 Seydikemer/Muğla adresinde mukim Tatildeyiz Turizm ve Emlak Yatırımları Limited Şirketi ile Elektronik ortamda onaylanan konfirmasyon belgesinden yer alan mecurun, aşağıdaki yer alan şartlarla ve süre ile misafir "TC Kimlik / Pasaport Numarası" T.C. Kimlik veya Pasaport numaralı "Adres" Adresinde mukim "Rezervasyonu Yapan Kişinin Adı" (MİSAFİR)( elektronik ortamda beyan edilip onaylanan kişisel veriler) ve "Tesis Adı", adlı taşınmazın, "Giriş Tarihi ve Çıkış Tarihi" günleri arasında "Rezervasyon Numarası" rezervasyon numarası ile kiralanması şeklindedir.

Tanımlar ve Sözleşme Konusu
İşbu sözleşme kapsamında kullanılacak olan kavramlar ve ifadeler ile kısaltmalar, herhangi bir tereddütte mahal verilmemesi açısından aşağıda somutlaştırılmıştır.
Bu doğrultuda;
SÖZLEŞME : İşbu internet ortamından onaylanan ve yazılı bir sözleşmenin varlığı halinde sona eren rezervasyon sözleşmesini,
MİSAFİR : Sözleşme kapsamında ilgili tesisi (tatil konutunu) rezervasyon süresi boyunca kiralayan gerçek ya da tüzel kişiyi ile tüzel kişi niteliğindeki kamu kurum ve kuruluşları, dernekler ile vakıfları,
ŞİRKET : Teslimi sağlanacak olan tatil tesisini rezervasyonu alan/kiralayan Tatildeyiz/ Tatildeyiz Turizm ve Emlak Yatırımları Limited Şirketi'ni,
TESİS : www.tatildeyiz.com.tr adresli internet sitesi üzerinden rezervasyona hazır hale getirilen mecur,
Rezervasyon/Kira Süresi : İnternet sitesi üzerinden misafir tarafından seçilen ve MİSAFİR tarafından onaylanan kira süresini,
Rezervasyon/Kira Bedeli : Site üzerinden her tatil konutuna ayrı olmak üzere hazırlanmış ilgili süreye göre belirlenen kira bedelini,
TBK : 6098 sayılı Türk Borçlar Kanunu'nu,
KVKK : 6698 sayılı Kişisel Verilerin Korunması Hakkında Kanun'u ifade eder.
Bu kapsamda; ŞİRKET tarafından tesisler/tatil konutları www.tatildeyiz.com.tr URL adresli internet sitesinde sergilenmektedir. MİSAFİR tarafından ilgili TESİSİN uygun olduğu tarihler seçilerek aşağıda yer alan hükümler doğrultusunda ÖN ÖDEME / KAPORA bedelleri yatırılmak suretiyle işbu REZERVASYON / KİRALAMA sözleşmesi kurulmuştur.

Başlangıç Hükümleri
İşbu kapsamda şirket tarafından www.tatildeyiz.com.tr ibareli internet sitesi üzerinden misafir tarafından tatil konutu ve ilgili TESİSİN kiralanacağı tarihler internet ortamından belirtilecektir.
Bu kapsamda ulaşım ve fatura bilgileri misafir tarafından şirkete teslim edilecek, tarihlerin ve kiralanacak olan TESİSİN uygun bulunması halinde ön rezervasyon işlemi gerçekleştirilecektir.
www.tatildeyiz.com.tr URL adresinde yer alan her bir tatil konutuna ilişkin ilanda; mecurun niteliği, vasfı, özellikleri, uygunluk durumları ve tarihleri, bakımı ve kullanıma ilişkin özellikleri ile mecurun kiralanmasına ve misafir tarafından yapılması gereken masraflara ilişkin hususlar belirtilmiştir. Herhangi bir ihtilaf halinde internet sitesi içerisinde yer alan kayıtlar hukuken geçerli sayılacaktır.
www.tatildeyiz.com.tr URL adresli site üzerinden resimlerdeki mülkü REZERVASYON ALMAK / KİRALAMAKLA mükelleftir, mülkün adını değiştirme hakkını saklı tutar.

Rezervasyon ve Ödeme
Tesislerimize web sayfamızda bulunan rezervasyon formu, SMS, telefon yolu ile veya elektronik posta yolu ile ön rezervasyon yapılabilmektedir. www.tatildeyiz.com.tr isimli internet sitesi REZERVASYON / KİRALAMA şartları REZERVASYON / KİRALAMAK istediğiniz tesisi, konaklama tarihlerini belirtip, sizden gerekli rezervasyon bilgilerini alarak ön rezervasyon işleminiz yapılacaktır. Ön rezervasyon sonrasında www.tatildeyiz.com.tr tesis için tesis sahibi tarafından belirlenen ve tesis bilgilerinin yer aldığı sayfada belirtilen ÖN ÖDEME / KAPORA tutarını ön ödeme olarak talep etmektedir. ÖN ÖDEME / KAPORA 1 (bir) iş günü (24 saat) içinde ödendiği takdirde tesis adınıza rezerve edilerek bekletilir. Ödemesi gereken ÖN ÖDEME / KAPORA tutarı ve banka hesap numaramız elektronik posta yolu ile veya SMS yolu ile tarafınıza bildirilecektir. ÖN ÖDEME / KAPORA 1 iş günü içinde Havale, Eft ve Kredi Kartı ile ödeme yapılabilecektir. ÖN ÖDEME / KAPORA alındığında en geç 1 iş günü içinde tarafınıza yazılı olarak rezervasyon onayı ve ödeme detayları gönderilecektir. ÖN ÖDEME / KAPORA'nın belirtilen süre içerisinde yatırılmaması durumunda www.tatildeyiz.com.tr firması müşteriye bilgi vermeden ön rezervasyonu iptal etme ve yerine başka rezervasyon alma hakkını kullanabilecektir.
Rezervasyon ve ödeme onayından sonra kalan ödemeyi giriş günü tesis teslim aldıktan sonra ilgili kişi/görevliye ödenir. Tesise / Tatil evinize girişte sizlerden ilanda belirtilen miktarda hasar depozitosu alınacaktır. Bu bedel çıkış yapacağınız saatten 10 dakika önce yapılacak olan genel kontrolde herhangi bir aksaklık veya hasar olmaması durumunda tarafınıza iade edilir.
Yukarıdaki sebeplerden oluşabilecek mağduriyetlerin önlenebilmesi için bu tutarların tesise, tatil evinize giriş günü nakit olarak yanınızda hazır bulunmasını önemle hatırlatır rica ederiz.

Tesise Giriş/Çıkış
Tesise giriş saati tesis bilgilerinin yer aldığın internet sayfamızda yer almaktadır. Misafir belirtilen saatler dışında giriş yapmak için önceden bilgi vermeli yaklaşık giriş saatini bildirmeli ve onay almalıdır. Müşteri giriş saatini bildirmeden onay almadan belirtilen saatler dışında tesise giriş yapamaz. Belirtilen saatlerde misafir gelmez ise giriş saatlerine uyulmadığı takdirde bir gün sonra sabah www.tatildeyiz.com.tr firmasının mesai başlangıcında (09:00) giriş yapabilir. Müşterinin belirtilen saatten önce veya belirtilen saatten sonra gelmesi durumunda tesise giriş yapamamasından kaynaklanan sorunlardan, gece konaklamasından, konaklama yeri bulamamasından vs. problemlerden www.tatildeyiz.com.tr firması sorumlu tutulamaz.
Çıkış günü için en geç çıkış yapılabilecek saat internet sitemizde ve misafir tarafından onaylanan konfirmasyon belgesinde yer almakta olan saatte tesis sorumlusuna teslim edilir. Çıkış saatinden sonra misafir evde kalmaya devam ettiği takdirde 1 gecelik konaklama bedelinin tamamını ödemekle yükümlüdür.

Hasar Depozitosu ve Zararlar
MİSAFİR, rezervasyon yapılan tesis taşınmazının demirbaş eşyasını özenle kullanmak zorundadır. Rezervasyon yapılan tesise veya demirbaş eşyalarına zarar vermesi durumunda verdiği zararı ödemek zorundadır. Rezervasyon yapılan tesis, bahçe, havuz ve taşınmaz demirbaş eşyalarında oluşan herhangi bir zarar misafir tarafından karşılanır. MİSAFİR, tatili bitiminde tesis ve taşınmazı teslim ederken, tesis sorumlusu görevlisi tarafından yapılacak olan kontrolde belirtilen herhangi bir eksik veya hasar olmaması durumunda güvence bedelini tam olarak geri alır. Belirtilen herhangi bir eksik veya zarar olması durumunda eksiklerin bedeli veya zarar karşılanıp kalan tutar misafire geri teslim edilir. Herhangi bir eksik veya zarar karşılanmıyorsa zarar eksik misafirden talep edilir.

Kişi Sayısı, Evcil Hayvan, Sigara
Tesislerde rezervasyon formunda Adı, Soyadı belirtilen kişilerin sayısı kadar kişi kabul edilmektedir. (0-2 yaş bebekler hariç)
Aksi belirtilmediği takdirde tesise evcil hayvan kabul edilmemektedir.
Konaklama yapılan tesiste kapalı alanlarda sigara içilmesi kesinlikle yasaktır.
Rezervasyon yapılan tesislerin kapasite sayıları web sayfamızda belirtilmekte olup, kapasite sayısı kadar misafir tarafından kullanabilir. Rezervasyon yapılırken belirtilen kişi sayısı dışındaki ilave kişilerin girişine izin verilmemektedir.
Tesise girişte kimlik bildirme zorunluluğu vardır. Kimlik Bildirim kanunu hükümlerine uyulmaması durumunda maruz kalınacak ceza olması durumunda bu tutarlar Misafir tarafında ödenecektir.
Ayrıca MİSAFİR tarafından belirtilen kişi sayısı dışında ekstra bir kişi olması halinde her tesis için belirlenen kişi başı gecelik ücret uygulanmaktadır.

Temizlik, Bakım, Ekstra Harcamalar
Konaklama yapılan tesis size temiz olarak teslim edilmektedir. İhtiyaç halinde ekstra temizlik ücreti karşılığında yapılmaktadır. Bahçe ve havuz bakım görevlileri sabah erken saatlerde günlük olarak yapmaktadır. Konaklama süresince, elektrik, su, tüp gaz ücretleri, havuz, bahçe bakım, giriş temizliği fiyatlara dahildir. Fiyatlara hava alanı transfer ücretleri ve araç kiralama ücretleri dahil değildir.

İptal Şartları
MİSAFİR tatilinin başladığı ilk gün evde kalacağını bildirdikten sonra tesis içerisinde çıkacak olan herhangi bir arıza, sağlık problemi, komşulardan rahatsız olma veya bölgeden memnun kalmama gibi gerekçelerle iptal hakkı bulunmamaktadır. (Doğal afetler, savaş ve terör olayları hariç)
MİSAFİR ön ödeme yaptığı ve onaylanan rezervasyonlarda iptal ve tarih değiştirme hakkı bulunmamaktadır. Misafir taraf herhangi bir aksilik durumunda rezervasyon yapılan tesisin iptal edilmesi durumunda en az 30 gün önceden bildirmek kaydı ile eşdeğerde başka bir tesis tahsis eder. MİSAFİR, tahsis edilen tesisi kabul etmemesi durumunda ön ödeme ve yapılan diğer ödemeleri geri talep edebilir. Ön ödeme ve yapılan diğer ödemeler 7 iş günü içerisinde eksiksiz olarak iade edilir. Doğal afet, salgın hastalık, savaş, terör olayları, sosyal medya ve televizyon basını veya haber kuruluşları tarafından yapılan olumsuz haberlerden kaynaklanan iptallerde iptal kuralları geçerlidir. MİSAFİR herhangi bir gerekçe göstermeden www.tatildeyiz.com.tr iptal gerçekleştirmez.`;

export type ReservationContractPlaceholders = {
  guestName: string;
  identityMasked: string;
  address: string;
  villaName: string;
  dateRangeLabel: string;
  reservationCode: string;
  brandDomain?: string;
};

function stripHtmlToPlainText(html: string): string {
  return html
    .replace(/\r\n/g, "\n")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*p\s*>/gi, "\n\n")
    .replace(/<\/\s*div\s*>/gi, "\n")
    .replace(/<\/\s*h[1-6]\s*>/gi, "\n\n")
    .replace(/<\/\s*li\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function applyReservationContractPlaceholders(
  body: string,
  placeholders: ReservationContractPlaceholders
): string {
  const domain =
    placeholders.brandDomain?.replace(/^https?:\/\//i, "").replace(/\/$/, "") ||
    "www.tatildeyiz.com.tr";

  return body
    .replace(/##MUSTERIADI##/gi, placeholders.guestName)
    .replace(/##MÜŞTERİADI##/gi, placeholders.guestName)
    .replace(/##TCNO##/gi, placeholders.identityMasked)
    .replace(/##ADRES##/gi, placeholders.address)
    .replace(/##TESISADI##/gi, placeholders.villaName)
    .replace(/##TESİSADI##/gi, placeholders.villaName)
    .replace(/##REZKOD##/gi, placeholders.reservationCode)
    .replace(/##REZNO##/gi, placeholders.reservationCode)
    .replace(/##TARIHLER##/gi, placeholders.dateRangeLabel)
    .replace(/##DOMAIN##/gi, domain)
    .replace(/"TC Kimlik \/ Pasaport Numarası"/g, `"${placeholders.identityMasked}"`)
    .replace(/"Adres"/g, `"${placeholders.address}"`)
    .replace(
      /"Rezervasyonu Yapan Kişinin Adı"/g,
      `"${placeholders.guestName}"`
    )
    .replace(/"Tesis Adı"/g, `"${placeholders.villaName}"`)
    .replace(
      /"Giriş Tarihi ve Çıkış Tarihi"/g,
      `"${placeholders.dateRangeLabel}"`
    )
    .replace(/"Rezervasyon Numarası"/g, `"${placeholders.reservationCode}"`);
}

/**
 * CMS hukuki sayfasından sözleşme metnini alır; yoksa örnek PDF fallback.
 * Dönen metin henüz kişiselleştirilmemiş olabilir (placeholder’lı).
 */
export async function loadOnlineReservationContractBody(): Promise<{
  body: string;
  source: "cms" | "fallback";
}> {
  try {
    const page = await getPublishedCmsPage(RESERVATION_CONTRACT_SLUG);
    const content = page?.content?.trim() || "";
    if (content.length > 80) {
      return { body: stripHtmlToPlainText(content), source: "cms" };
    }
  } catch (error) {
    console.warn(
      "[reservation-document] CMS sözleşme yüklenemedi, fallback kullanılacak",
      error
    );
  }
  return { body: FALLBACK_ONLINE_RESERVATION_CONTRACT, source: "fallback" };
}
