export type RegionContent = {
  description: string;
  longDescription: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  focusKeyword: string;
};

export const REGION_CONTENT_BY_SLUG: Record<string, RegionContent> = {
  afyon: {
    description:
      "Afyon, termal otelleri ve sağlık turizmiyle öne çıkan önemli bir iç turizm destinasyonudur.",
    longDescription:
      "Afyon, Türkiye'nin en güçlü termal turizm merkezlerinden biridir. Kaplıcaları, sağlık otelleri ve şifalı suları ile yıl boyunca ziyaretçi çeker. Özellikle kış aylarında termal tatil için tercih edilir. Bölge aynı zamanda tarihi dokusu ve gastronomisiyle de dikkat çeker. Sağlık ve dinlenme odaklı tatil arayanlar için ideal bir destinasyondur.",
    seoTitle: "Afyon Termal Tatil Rehberi 2026",
    seoDescription:
      "Afyon kaplıcaları, termal oteller ve sağlık turizmi rehberi.",
    seoKeywords: "afyon, termal, kaplıca, sağlık turizmi, otel",
    focusKeyword: "afyon tatil",
  },
  adapazari: {
    description:
      "Adapazarı, Sakarya'nın merkezi olup şehir ve doğa yaşamını birleştiren bir bölgedir.",
    longDescription:
      "Adapazarı, Marmara Bölgesi'nin gelişmiş şehirlerinden biridir. Şehir yaşamı ile doğal alanların birleştiği yapısı sayesinde kısa kaçamaklar için uygundur. Yakın çevresindeki doğa alanları ve göl bölgeleri ile hafta sonu turizmi için tercih edilir.",
    seoTitle: "Adapazarı Gezi Rehberi 2026",
    seoDescription: "Adapazarı gezilecek yerler ve kısa tatil rehberi.",
    seoKeywords: "adapazari, sakarya, marmara, gezi",
    focusKeyword: "adapazari tatil",
  },
  sapanca: {
    description:
      "Sapanca, göl manzarası ve doğa turizmiyle Marmara'nın en popüler kaçış noktalarındandır.",
    longDescription:
      "Sapanca, gölü, bungalov evleri ve doğa aktiviteleri ile ünlüdür. İstanbul'a yakınlığı nedeniyle hafta sonu tatillerinin en çok tercih edilen bölgelerinden biridir. Doğa yürüyüşleri, bisiklet rotaları ve göl aktiviteleri sunar.",
    seoTitle: "Sapanca Gezi Rehberi 2026 | Doğa Tatili",
    seoDescription:
      "Sapanca gölü, bungalov evler ve doğa tatili rehberi.",
    seoKeywords: "sapanca, göl, bungalov, doğa tatili",
    focusKeyword: "sapanca tatil",
  },
  alanya: {
    description:
      "Alanya, uzun sahilleri ve hareketli turizm hayatıyla Türkiye'nin en popüler tatil merkezlerindendir.",
    longDescription:
      "Alanya, Akdeniz'in en büyük turizm şehirlerinden biridir. Kleopatra Plajı, tarihi Alanya Kalesi ve geniş konaklama seçenekleri ile yıl boyunca turist çeker. Deniz, eğlence ve kültür turizmi bir aradadır.",
    seoTitle: "Alanya Tatil Rehberi 2026",
    seoDescription: "Alanya plajları, otelleri ve tatil rehberi.",
    seoKeywords: "alanya, antalya, plaj, tatil, kale",
    focusKeyword: "alanya tatil",
  },
  belek: {
    description:
      "Belek, golf turizmi ve lüks resort otelleriyle öne çıkan bir tatil bölgesidir.",
    longDescription:
      "Belek, Antalya'nın en planlı turizm merkezlerinden biridir. Golf sahaları, 5 yıldızlı oteller ve geniş plajları ile lüks tatil segmentine hitap eder. Aile tatilleri için de oldukça uygundur.",
    seoTitle: "Belek Tatil Rehberi 2026",
    seoDescription: "Belek otelleri, golf sahaları ve lüks tatil rehberi.",
    seoKeywords: "belek, golf, antalya, resort, lüks",
    focusKeyword: "belek tatil",
  },
  demre: {
    description:
      "Demre, Noel Baba Kilisesi ve tarihi Likya kalıntılarıyla bilinen kültürel bir bölgedir.",
    longDescription:
      "Demre, hem tarihi hem de kıyı turizmi açısından önemli bir destinasyondur. Likya uygarlığı izleri, Myra Antik Kenti ve Noel Baba Kilisesi bölgeyi özel kılar.",
    seoTitle: "Demre Gezi Rehberi 2026",
    seoDescription: "Demre tarihi yerler ve kültür turizmi rehberi.",
    seoKeywords: "demre, antalya, likya, tarih",
    focusKeyword: "demre tatil",
  },
  kalkan: {
    description:
      "Kalkan, villa turizmi ve deniz manzaralı lüks konaklama seçenekleriyle ünlüdür.",
    longDescription:
      "Kalkan, Kaş ilçesine bağlı olup yamaç üzerine kurulu yapısıyla panoramik deniz manzarası sunar. Lüks villalar, butik oteller ve Kaputaş Plajı'na yakınlığıyla öne çıkar.",
    seoTitle: "Kalkan Tatil Rehberi 2026",
    seoDescription: "Kalkan villa tatili, plajlar ve konaklama rehberi.",
    seoKeywords: "kalkan, villa, antalya, kaputas",
    focusKeyword: "kalkan tatil",
  },
  islamar: {
    description:
      "İslamlar, doğa içinde sakin villa tatili sunan küçük bir köydür.",
    longDescription:
      "İslamlar Köyü, Kalkan'a yakın konumda doğa içinde yer alır. Serin havası, alabalık restoranları ve villa tatili seçenekleriyle bilinir.",
    seoTitle: "İslamlar Köyü Tatil Rehberi",
    seoDescription: "İslamlar doğa tatili ve villa konaklama rehberi.",
    seoKeywords: "islamlar, kalkan, villa, doga",
    focusKeyword: "islamlar tatil",
  },
  uzumlu: {
    description:
      "Üzümlü, Kalkan yakınlarında doğa içinde sakin bir villa bölgesidir.",
    longDescription:
      "Üzümlü, bağ evleri ve doğa içinde konaklama seçenekleriyle öne çıkar. Sessiz tatil arayanlar için idealdir.",
    seoTitle: "Üzümlü Tatil Rehberi",
    seoDescription: "Üzümlü köyü villa ve doğa tatili.",
    seoKeywords: "uzumlu, kalkan, villa",
    focusKeyword: "uzumlu tatil",
  },
  "kalkan-merkez": {
    description:
      "Kalkan Merkez, restoranlar ve marina yapısıyla canlı bir tatil merkezidir.",
    longDescription:
      "Kalkan Merkez, restoranları, butik otelleri ve sahil şeridi ile yaz sezonunda oldukça hareketlidir. Lüks tatil deneyimi sunar.",
    seoTitle: "Kalkan Merkez Gezi Rehberi",
    seoDescription: "Kalkan merkez restoranlar ve konaklama rehberi.",
    seoKeywords: "kalkan merkez, antalya",
    focusKeyword: "kalkan merkez",
  },
  patara: {
    description:
      "Patara, antik kent ve uzun sahiliyle tarih ve doğayı birleştirir.",
    longDescription:
      "Patara, Likya'nın önemli şehirlerinden biridir. 18 km uzun sahili ve antik kalıntıları ile eşsiz bir destinasyondur.",
    seoTitle: "Patara Gezi Rehberi 2026",
    seoDescription: "Patara plajı ve antik kent rehberi.",
    seoKeywords: "patara, antik, likya, plaj",
    focusKeyword: "patara tatil",
  },
  yesilkoy: {
    description:
      "Yeşilköy, doğa içinde sakin köy yaşamı sunan küçük bir yerleşimdir.",
    longDescription:
      "Yeşilköy, Antalya'nın kırsal bölgelerinden biri olup doğa ve sakinlik arayanlar için uygundur.",
    seoTitle: "Yeşilköy Tatil Rehberi",
    seoDescription: "Yeşilköy doğa tatili rehberi.",
    seoKeywords: "yesilkoy, antalya, doga",
    focusKeyword: "yesilkoy tatil",
  },
  akbel: {
    description:
      "Akbel, Kalkan'a yakın yüksek konumlu sakin bir yerleşimdir.",
    longDescription:
      "Akbel, Kalkan'a hakim konumu ile deniz manzaralı villa seçenekleri sunar.",
    seoTitle: "Akbel Tatil Rehberi",
    seoDescription: "Akbel villa ve manzara tatili.",
    seoKeywords: "akbel, kalkan, villa",
    focusKeyword: "akbel tatil",
  },
  kas: {
    description:
      "Kaş, dalış noktaları ve bohem atmosferiyle ünlü bir Akdeniz kasabasıdır.",
    longDescription:
      "Kaş, Likya Yolu, dalış merkezleri ve turkuaz koylarıyla Türkiye'nin en özel tatil noktalarından biridir.",
    seoTitle: "Kaş Tatil Rehberi 2026",
    seoDescription: "Kaş gezilecek yerler, dalış ve tatil rehberi.",
    seoKeywords: "kas, dalis, likya, antalya",
    focusKeyword: "kas tatil",
  },
  cukurbag: {
    description: "Çukurbağ, Kaş'a bağlı doğa içinde villa bölgesidir.",
    longDescription:
      "Çukurbağ Yarımadası, deniz manzaralı villaları ve sakin atmosferiyle bilinir.",
    seoTitle: "Çukurbağ Tatil Rehberi",
    seoDescription: "Kaş Çukurbağ villa tatili.",
    seoKeywords: "cukurbag, kas, villa",
    focusKeyword: "cukurbag tatil",
  },
  yarimada: {
    description: "Yarımada, Kaş'ın en özel manzara noktalarından biridir.",
    longDescription:
      "Çukurbağ Yarımadası, lüks villa konaklamaları ve deniz manzarasıyla öne çıkar.",
    seoTitle: "Yarımada Tatil Rehberi",
    seoDescription: "Kaş yarımada villa rehberi.",
    seoKeywords: "yarimada, kas",
    focusKeyword: "yarimada tatil",
  },
  bayindir: {
    description:
      "Bayındır, Kaş çevresinde doğa içinde küçük bir yerleşimdir.",
    longDescription:
      "Bayındır, Kaş'ın kırsal alanlarında yer alır ve sakin tatil sunar.",
    seoTitle: "Bayındır Tatil Rehberi",
    seoDescription: "Bayındır doğa tatili.",
    seoKeywords: "bayindir, kas",
    focusKeyword: "bayindir tatil",
  },
  kemer: {
    description:
      "Kemer, orman ve denizin birleştiği popüler bir tatil bölgesidir.",
    longDescription:
      "Kemer, Toros Dağları'nın eteklerinde yer alır. Koyları, plajları ve doğasıyla öne çıkar.",
    seoTitle: "Kemer Tatil Rehberi",
    seoDescription: "Kemer plajları ve doğa tatili.",
    seoKeywords: "kemer, antalya, koylar",
    focusKeyword: "kemer tatil",
  },
  lara: {
    description:
      "Lara, Antalya şehir merkezine yakın sahil otelleriyle bilinir.",
    longDescription:
      "Lara, uzun plajları ve 5 yıldızlı otelleriyle şehir otelciliğinin merkezidir.",
    seoTitle: "Lara Tatil Rehberi",
    seoDescription: "Lara otelleri ve plaj rehberi.",
    seoKeywords: "lara, antalya, otel",
    focusKeyword: "lara tatil",
  },
  kusadasi: {
    description:
      "Kuşadası, kruvaziyer limanı ve plajlarıyla Ege'nin önemli turizm merkezidir.",
    longDescription:
      "Kuşadası, hem tarihi Efes'e yakınlığı hem de sahil turizmiyle öne çıkar.",
    seoTitle: "Kuşadası Tatil Rehberi",
    seoDescription: "Kuşadası plajlar ve gezi rehberi.",
    seoKeywords: "kusadasi, aydin",
    focusKeyword: "kusadasi tatil",
  },
  didim: {
    description: "Didim, Altınkum Plajı ve uygun fiyatlı tatiliyle bilinir.",
    longDescription:
      "Didim, uzun plajları ve sakin atmosferiyle aile tatilleri için idealdir.",
    seoTitle: "Didim Tatil Rehberi",
    seoDescription: "Didim plajları ve tatil rehberi.",
    seoKeywords: "didim, aydin",
    focusKeyword: "didim tatil",
  },
  bolu: {
    description:
      "Bolu, doğa turizmi ve ormanlarıyla dört mevsim ziyaret edilen bir bölgedir.",
    longDescription:
      "Bolu, Abant ve Yedigöller gibi doğal alanlarıyla doğa turizminin merkezidir.",
    seoTitle: "Bolu Gezi Rehberi",
    seoDescription: "Bolu doğa ve göl turizmi.",
    seoKeywords: "bolu, doga, abant",
    focusKeyword: "bolu tatil",
  },
  bursa: {
    description:
      "Bursa, tarih ve termal turizmin birleştiği önemli bir şehirdir.",
    longDescription:
      "Bursa, Osmanlı tarihi, Uludağ ve termal kaynaklarıyla çok yönlü turizm sunar.",
    seoTitle: "Bursa Gezi Rehberi",
    seoDescription: "Bursa tarih ve termal turizm.",
    seoKeywords: "bursa, tarih, termal",
    focusKeyword: "bursa tatil",
  },
  cesme: {
    description:
      "Çeşme, Ege'nin en popüler yaz tatili merkezlerinden biridir.",
    longDescription:
      "Çeşme, plajları, rüzgar sörfü ve gece hayatıyla yaz turizminin merkezidir.",
    seoTitle: "Çeşme Tatil Rehberi",
    seoDescription: "Çeşme plajlar ve yaz tatili.",
    seoKeywords: "cesme, izmir",
    focusKeyword: "cesme tatil",
  },
  alacati: {
    description:
      "Alaçatı, taş evleri ve sörf kültürüyle ünlü bir Ege kasabasıdır.",
    longDescription:
      "Alaçatı, butik otelleri ve rüzgar sörfü merkezleriyle Türkiye'nin en özel destinasyonlarından biridir.",
    seoTitle: "Alaçatı Tatil Rehberi",
    seoDescription: "Alaçatı sörf ve butik tatil.",
    seoKeywords: "alacati, izmir",
    focusKeyword: "alacati tatil",
  },
  bodrum: {
    description:
      "Bodrum, lüks tatil ve gece hayatıyla Türkiye'nin en güçlü destinasyonudur.",
    longDescription:
      "Bodrum, marinaları, koyları ve eğlence hayatıyla Ege'nin merkezidir.",
    seoTitle: "Bodrum Tatil Rehberi",
    seoDescription: "Bodrum koylar ve lüks tatil.",
    seoKeywords: "bodrum, mugla",
    focusKeyword: "bodrum tatil",
  },
  bitez: {
    description: "Bitez, sakin plajlarıyla Bodrum'un huzurlu bölgelerindendir.",
    longDescription:
      "Bitez, sığ denizi ve aile dostu yapısıyla öne çıkar.",
    seoTitle: "Bitez Tatil Rehberi",
    seoDescription: "Bitez plaj ve sakin tatil.",
    seoKeywords: "bitez, bodrum",
    focusKeyword: "bitez tatil",
  },
  yalikavak: {
    description:
      "Yalıkavak, lüks marina ve premium yaşam alanlarıyla öne çıkar.",
    longDescription:
      "Yalıkavak, Bodrum'un en prestijli bölgelerinden biridir.",
    seoTitle: "Yalıkavak Tatil Rehberi",
    seoDescription: "Yalıkavak marina ve lüks tatil.",
    seoKeywords: "yalikavak, bodrum",
    focusKeyword: "yalikavak tatil",
  },
  turgutreis: {
    description: "Turgutreis, gün batımı ve sahil yaşamıyla bilinir.",
    longDescription:
      "Turgutreis, uzun sahili ve marina yapısıyla tatilcilerin tercihidir.",
    seoTitle: "Turgutreis Tatil Rehberi",
    seoDescription: "Turgutreis sahil ve tatil.",
    seoKeywords: "turgutreis, bodrum",
    focusKeyword: "turgutreis tatil",
  },
  gundogan: {
    description: "Gündoğan, sakin ve butik tatil isteyenler için idealdir.",
    longDescription: "Gündoğan, Bodrum'un en huzurlu koylarından biridir.",
    seoTitle: "Gündoğan Tatil Rehberi",
    seoDescription: "Gündoğan koylar ve sakin tatil.",
    seoKeywords: "gundogan, bodrum",
    focusKeyword: "gundogan tatil",
  },
  adabuku: {
    description: "Adabükü, doğa ve deniz iç içe bir Bodrum bölgesidir.",
    longDescription:
      "Adabükü, kuş cenneti ve doğal yapısıyla dikkat çeker.",
    seoTitle: "Adabükü Tatil Rehberi",
    seoDescription: "Adabükü doğa ve tatil.",
    seoKeywords: "adabuku, bodrum",
    focusKeyword: "adabuku tatil",
  },
  dalyan: {
    description:
      "Dalyan, caretta caretta kaplumbağalarıyla ünlü doğal bir bölgedir.",
    longDescription:
      "Dalyan, nehir turları ve İztuzu Plajı ile doğa turizminin merkezidir.",
    seoTitle: "Dalyan Tatil Rehberi",
    seoDescription: "Dalyan doğa ve nehir turları.",
    seoKeywords: "dalyan, mugla",
    focusKeyword: "dalyan tatil",
  },
  fethiye: {
    description:
      "Fethiye, Türkiye'nin en güçlü villa ve doğa turizmi merkezidir.",
    longDescription:
      "Fethiye, Ölüdeniz, Göcek ve Kayaköy gibi destinasyonlarıyla çok yönlü bir tatil sunar.",
    seoTitle: "Fethiye Tatil Rehberi",
    seoDescription: "Fethiye villa ve doğa tatili.",
    seoKeywords: "fethiye, mugla",
    focusKeyword: "fethiye tatil",
  },
  oludeniz: {
    description:
      "Ölüdeniz, dünyaca ünlü lagünüyle Türkiye'nin en ikonik tatil noktasıdır.",
    longDescription:
      "Ölüdeniz, Babadağ, Kelebekler Vadisi ve lagün yapısıyla dünya çapında bilinir.",
    seoTitle: "Ölüdeniz Tatil Rehberi",
    seoDescription: "Ölüdeniz plaj ve yamaç paraşütü.",
    seoKeywords: "oludeniz, fethiye",
    focusKeyword: "oludeniz tatil",
  },
  "fethiye-merkez": {
    description:
      "Fethiye Merkez, marina ve şehir yaşamının birleştiği noktadır.",
    longDescription:
      "Fethiye Merkez, sahil, çarşı ve ulaşım avantajıyla öne çıkar.",
    seoTitle: "Fethiye Merkez Tatil Rehberi",
    seoDescription: "Fethiye merkez gezi ve konaklama.",
    seoKeywords: "fethiye merkez, mugla",
    focusKeyword: "fethiye merkez",
  },
  kayakoy: {
    description:
      "Kayaköy, tarihi taş evleriyle açık hava müzesi gibidir.",
    longDescription:
      "Kayaköy, terk edilmiş köy yapısıyla fotoğrafçılar için popülerdir.",
    seoTitle: "Kayaköy Tatil Rehberi",
    seoDescription: "Kayaköy tarih ve gezi.",
    seoKeywords: "kayakoy, fethiye",
    focusKeyword: "kayakoy tatil",
  },
  faralya: {
    description: "Faralya, Ölüdeniz manzaralı doğa köyüdür.",
    longDescription:
      "Faralya, Kelebekler Vadisi manzarası ve doğa otelleriyle ünlüdür.",
    seoTitle: "Faralya Tatil Rehberi",
    seoDescription: "Faralya doğa ve manzara tatili.",
    seoKeywords: "faralya, mugla",
    focusKeyword: "faralya tatil",
  },
  seydikemer: {
    description:
      "Seydikemer, Fethiye'ye yakın kırsal ve doğal bir bölgedir.",
    longDescription:
      "Seydikemer, doğa turizmi ve sakin yaşamıyla öne çıkar.",
    seoTitle: "Seydikemer Tatil Rehberi",
    seoDescription: "Seydikemer doğa tatili.",
    seoKeywords: "seydikemer, mugla",
    focusKeyword: "seydikemer tatil",
  },
  yakakoy: {
    description: "Yakaköy, doğa içinde küçük bir yerleşimdir.",
    longDescription: "Yakaköy, Seydikemer bölgesinde sakin tatil sunar.",
    seoTitle: "Yakaköy Tatil Rehberi",
    seoDescription: "Yakaköy köy tatili.",
    seoKeywords: "yakakoy, mugla",
    focusKeyword: "yakakoy tatil",
  },
  "fethiye-merkeze-yakin": {
    description:
      "Fethiye'ye yakın bölgeler, kolay ulaşım avantajı sunar.",
    longDescription:
      "Fethiye merkeze yakın alanlar hem şehir hem doğa erişimi sağlar.",
    seoTitle: "Fethiye Yakın Tatil Rehberi",
    seoDescription: "Fethiye çevresi konaklama rehberi.",
    seoKeywords: "fethiye yakin, mugla",
    focusKeyword: "fethiye yakin",
  },
  gocek: {
    description: "Göcek, yat turizmi ve koylarıyla lüks bir destinasyondur.",
    longDescription:
      "Göcek, 12 Adalar tekne turları ve marinalarıyla ünlüdür.",
    seoTitle: "Göcek Tatil Rehberi",
    seoDescription: "Göcek koylar ve tekne turu.",
    seoKeywords: "gocek, mugla",
    focusKeyword: "gocek tatil",
  },
  "yesil-uzumlu": {
    description: "Yeşil Üzümlü, bağ evleriyle doğa içinde bir köydür.",
    longDescription:
      "Yeşil Üzümlü, Fethiye'nin serin ve sakin köylerinden biridir.",
    seoTitle: "Yeşil Üzümlü Tatil Rehberi",
    seoDescription: "Üzümlü köyü doğa tatili.",
    seoKeywords: "uzumlu, fethiye",
    focusKeyword: "uzumlu tatil",
  },
  gokova: {
    description: "Gökova, doğa ve körfez manzarasıyla ünlü bir bölgedir.",
    longDescription:
      "Gökova Körfezi, mavi yolculuk rotalarının merkezindedir.",
    seoTitle: "Gökova Tatil Rehberi",
    seoDescription: "Gökova koylar ve mavi yolculuk.",
    seoKeywords: "gokova, mugla",
    focusKeyword: "gokova tatil",
  },
  koycegiz: {
    description:
      "Köyceğiz, gölü ve doğasıyla sakin bir tatil bölgesidir.",
    longDescription:
      "Köyceğiz Gölü ve Dalyan bağlantısı ile doğa turizmi sunar.",
    seoTitle: "Köyceğiz Tatil Rehberi",
    seoDescription: "Köyceğiz göl ve doğa tatili.",
    seoKeywords: "koycegiz, mugla",
    focusKeyword: "koycegiz tatil",
  },
  marmaris: {
    description:
      "Marmaris, koyları ve eğlence hayatıyla ünlü bir tatil merkezidir.",
    longDescription:
      "Marmaris, doğal limanı ve gece hayatıyla Türkiye'nin en popüler destinasyonlarından biridir.",
    seoTitle: "Marmaris Tatil Rehberi",
    seoDescription: "Marmaris koylar ve gece hayatı.",
    seoKeywords: "marmaris, mugla",
    focusKeyword: "marmaris tatil",
  },
  orhaniye: {
    description: "Orhaniye, Kızkumu plajıyla ünlü doğal bir koydur.",
    longDescription: "Orhaniye, sakin denizi ve doğasıyla bilinir.",
    seoTitle: "Orhaniye Tatil Rehberi",
    seoDescription: "Orhaniye Kızkumu plajı.",
    seoKeywords: "orhaniye, marmaris",
    focusKeyword: "orhaniye tatil",
  },
  sogut: {
    description:
      "Söğüt, Marmaris yakınlarında sakin bir balıkçı köyüdür.",
    longDescription:
      "Söğüt, doğa ve deniz manzarasıyla huzurlu tatil sunar.",
    seoTitle: "Söğüt Tatil Rehberi",
    seoDescription: "Söğüt köyü tatil rehberi.",
    seoKeywords: "sogut, marmaris",
    focusKeyword: "sogut tatil",
  },
  selimiye: {
    description: "Selimiye, sakin denizi ve butik otelleriyle ünlüdür.",
    longDescription:
      "Selimiye, Marmaris'in en huzurlu koylarından biridir.",
    seoTitle: "Selimiye Tatil Rehberi",
    seoDescription: "Selimiye koy ve butik tatil.",
    seoKeywords: "selimiye, marmaris",
    focusKeyword: "selimiye tatil",
  },
  dalaman: {
    description:
      "Dalaman, havalimanı bağlantısıyla stratejik bir tatil bölgesidir.",
    longDescription:
      "Dalaman, Fethiye ve Marmaris'e ulaşım sağlayan önemli bir merkezdir.",
    seoTitle: "Dalaman Tatil Rehberi",
    seoDescription: "Dalaman ulaşım ve konaklama.",
    seoKeywords: "dalaman, mugla",
    focusKeyword: "dalaman tatil",
  },
  camlihemsin: {
    description:
      "Çamlıhemşin, yaylaları ve Karadeniz doğasıyla ünlüdür.",
    longDescription:
      "Çamlıhemşin, Ayder Yaylası ve Fırtına Vadisi ile doğa turizminin merkezidir.",
    seoTitle: "Çamlıhemşin Gezi Rehberi",
    seoDescription: "Çamlıhemşin yayla ve doğa turizmi.",
    seoKeywords: "camlihemsin, rize",
    focusKeyword: "camlihemsin tatil",
  },
  "yalova-merkez": {
    description:
      "Yalova Merkez, termal kaynakları ve Marmara kıyısıyla bilinir.",
    longDescription:
      "Yalova, kaplıcalar ve İstanbul'a yakınlığıyla hafta sonu kaçamakları için idealdir.",
    seoTitle: "Yalova Gezi Rehberi",
    seoDescription: "Yalova termal ve sahil tatili.",
    seoKeywords: "yalova, marmara",
    focusKeyword: "yalova tatil",
  },
};

export function getRegionContentFields(slug: string) {
  const content = REGION_CONTENT_BY_SLUG[slug];
  if (!content) return null;

  return {
    description: content.description,
    longDescription: content.longDescription,
    seoTitle: content.seoTitle,
    seoDescription: content.seoDescription,
    seoKeywords: `${content.seoKeywords}, ${content.focusKeyword}`,
    showOnHome: true,
    showInSearch: true,
  };
}
