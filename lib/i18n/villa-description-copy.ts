export type VillaIntroInput = {
  name: string;
  typeLabel: string;
  location: string;
  plan: string;
  audience: string;
  guests: number;
};

export type VillaClosingInput = {
  location: string;
  guests: number;
  typeLabel: string;
  features: string;
  name: string;
};

export type VillaDescriptionCopy = {
  and: string;
  coupleStay: string;
  groupStay: (guests: number) => string;
  childRule: string;
  petRule: string;
  smokeRule: string;
  meter: string;
  intro: (input: VillaIntroInput) => string;
  concept: (typeLabel: string, features: string) => string;
  interior: (features: string, bedrooms: number, bathrooms: number) => string;
  exterior: (features: string) => string;
  standout: (feature: string, typeLabel: string) => string;
  rules: (rules: string) => string;
  distance: (phrases: string) => string;
  distanceAbout: (name: string, distance: string) => string;
  distanceTail: (locationNote: string) => string;
  minStay: (nights: number) => string;
  closing: (input: VillaClosingInput) => string;
};

const en: VillaDescriptionCopy = {
  and: "and",
  coupleStay: "a stay tailored for couples",
  groupStay: (guests) => `a comfortable stay for ${guests} guests`,
  childRule: "children are not allowed",
  petRule: "pets are not allowed",
  smokeRule: "smoking is not allowed",
  meter: "m",
  intro: ({ name, typeLabel, location, plan, audience, guests }) =>
    `<p><strong>${name}</strong> is a rental ${typeLabel} in ${location}, Turkey. The ${plan} layout offers ${audience}, with space for ${guests} guests.</p>`,
  concept: (typeLabel, features) =>
    `<p>What sets this ${typeLabel} apart is ${features}. The house is planned for guests who want a quiet Turkey villa holiday rather than a standard hotel stay.</p>`,
  interior: (features, bedrooms, bathrooms) =>
    `<p>Indoors, ${features} support everyday comfort. ${bedrooms} bedrooms and ${bathrooms} bathrooms keep the plan clear for couples or a larger group.</p>`,
  exterior: (features) =>
    `<p>Outside, ${features} keep the holiday on the property. Private outdoor space matters when you want the pool to yourself.</p>`,
  standout: (feature, typeLabel) =>
    `<p>${feature} is one of the details that separates this ${typeLabel} from similar rentals, whether you are here for a winter-sun week or a longer family stay.</p>`,
  rules: (rules) =>
    `<p>House rules: ${rules}. Read them before you book.</p>`,
  distance: (phrases) => `For distances, count on ${phrases}.`,
  distanceAbout: (name, distance) => `${name} about ${distance}`,
  distanceTail: (locationNote) =>
    locationNote.trim()
      ? ` ${locationNote.trim()}`
      : " Shops and restaurants nearby mean you can also plan meals without a long drive.",
  minStay: (nights) =>
    `<p>The minimum stay is ${nights} nights, which suits a planned holiday rather than a one-night stop.</p>`,
  closing: ({ location, guests, typeLabel, features, name }) =>
    `<p>This rental ${typeLabel} for ${guests} guests in ${location} is set up for a Turkey villa holiday with ${features}. If you are comparing ${name} with other homes, look at the pool, the transfer time and the minimum stay together.</p>`,
};

const tr: VillaDescriptionCopy = {
  and: "ve",
  coupleStay: "çiftlere özel bir konaklama deneyimi",
  groupStay: (guests) => `${guests} kişilik konforlu bir konaklama deneyimi`,
  childRule: "çocuk kabul edilmez",
  petRule: "evcil hayvan kabul edilmez",
  smokeRule: "sigara içilmez",
  meter: "metre",
  intro: ({ name, typeLabel, location, plan, audience, guests }) =>
    `<p><strong>${name}</strong>, ${location} bölgesinde yer alan seçkin bir kiralık ${typeLabel} seçeneğidir. ${plan} plan düzeninde tasarlanan evimiz ${guests} kişilik kapasitesiyle ${audience} sunar.</p>`,
  concept: (typeLabel, features) =>
    `<p>Bu ${typeLabel}nın öne çıkan yönü, ${features} gibi özellikleriyle misafirlere sıradan bir tatilden öte, özenle planlanmış bir atmosfer sunmasıdır. Doğayla iç içe konfor arayanlar için her detay düşünülmüştür.</p>`,
  interior: (features, bedrooms, bathrooms) =>
    `<p>İç mekânda misafirlerin rahatlığı için ${features} gibi donanımlar bulunur. ${bedrooms} yatak odası ve ${bathrooms} banyo ile düzenli, ferah bir yaşam alanı sunulur.</p>`,
  exterior: (features) =>
    `<p>Dış alanda ${features} gibi imkânlarla tatilin keyfini villanızda çıkarabilirsiniz. Özel alanlar sayesinde konaklamanız boyunca mahremiyet ve huzur bir arada yaşanır.</p>`,
  standout: (feature, typeLabel) =>
    `<p>${feature}, bu ${typeLabel}yı benzer seçeneklerden ayıran önemli detaylardan biridir. Gün içinde dinlenmek veya akşam saatlerinde keyifli vakit geçirmek isteyen misafirler için gerçek bir artı değer yaratır.</p>`,
  rules: (rules) =>
    `<p>Konaklama kuralları kapsamında ${rules}. Lütfen rezervasyon öncesi kuralları gözden geçirin.</p>`,
  distance: (phrases) => `Konum olarak ${phrases} mesafededir.`,
  distanceAbout: (name, distance) => `${name} yaklaşık ${distance}`,
  distanceTail: (locationNote) =>
    locationNote.trim()
      ? ` ${locationNote.trim()}`
      : " Çevredeki market ve restoranlara kolay erişim sayesinde tatilinizi villadan çıkmadan da rahatlıkla planlayabilirsiniz.",
  minStay: (nights) =>
    `<p>Minimum konaklama süresi ${nights} gecedir. Bu yönüyle planlı ve konforlu bir tatil için uygun bir seçenektir.</p>`,
  closing: ({ location, guests, typeLabel, features, name }) =>
    `<p>${location} bölgesinde ${guests} kişilik kapasiteye sahip bu kiralık ${typeLabel}, ${features} ile unutulmaz bir villa kiralama deneyimi sunar. ${name} arayan misafirler için hem konumu hem de sunduğu imkânlar açısından güçlü bir tercihtir.</p>`,
};

const de: VillaDescriptionCopy = {
  and: "und",
  coupleStay: "einen Aufenthalt für Paare",
  groupStay: (guests) => `einen komfortablen Aufenthalt für ${guests} Gäste`,
  childRule: "Kinder sind nicht erlaubt",
  petRule: "Haustiere sind nicht erlaubt",
  smokeRule: "Rauchen ist nicht erlaubt",
  meter: "m",
  intro: ({ name, typeLabel, location, plan, audience, guests }) =>
    `<p><strong>${name}</strong> ist eine ${typeLabel} zur Miete in ${location}, Türkei. Der ${plan}-Grundriss bietet ${audience} und Platz für ${guests} Gäste.</p>`,
  concept: (typeLabel, features) =>
    `<p>Diese ${typeLabel} hebt sich durch ${features} ab. Das Haus ist für Gäste gedacht, die einen ruhigen Türkei-Urlaub statt eines Hotelzimmers suchen.</p>`,
  interior: (features, bedrooms, bathrooms) =>
    `<p>Im Haus sorgen ${features} für den Alltag. ${bedrooms} Schlafzimmer und ${bathrooms} Bäder halten den Grundriss für Paare oder eine größere Gruppe übersichtlich.</p>`,
  exterior: (features) =>
    `<p>Draußen bleiben Sie mit ${features} auf dem Grundstück. Ein privater Außenbereich zählt, wenn der Pool Ihnen gehören soll.</p>`,
  standout: (feature, typeLabel) =>
    `<p>${feature} unterscheidet diese ${typeLabel} von ähnlichen Ferienhäusern, ob für eine Wintersonnenwoche oder einen längeren Familienurlaub.</p>`,
  rules: (rules) =>
    `<p>Hausregeln: ${rules}. Bitte vor der Buchung lesen.</p>`,
  distance: (phrases) => `Bei den Entfernungen rechnen Sie mit ${phrases}.`,
  distanceAbout: (name, distance) => `${name} etwa ${distance}`,
  distanceTail: (locationNote) =>
    locationNote.trim()
      ? ` ${locationNote.trim()}`
      : " Läden und Restaurants in der Nähe erleichtern den Alltag ohne lange Fahrt.",
  minStay: (nights) =>
    `<p>Der Mindestaufenthalt beträgt ${nights} Nächte und passt zu einem geplanten Urlaub, nicht zu einer Übernachtung.</p>`,
  closing: ({ location, guests, typeLabel, features, name }) =>
    `<p>Diese ${typeLabel} für ${guests} Gäste in ${location} ist auf einen Türkei-Urlaub mit ${features} ausgelegt. Wenn Sie ${name} vergleichen, sehen Sie Pool, Transferzeit und Mindestaufenthalt zusammen.</p>`,
};

const fr: VillaDescriptionCopy = {
  and: "et",
  coupleStay: "un séjour pensé pour les couples",
  groupStay: (guests) => `un séjour confortable pour ${guests} voyageurs`,
  childRule: "les enfants ne sont pas acceptés",
  petRule: "les animaux ne sont pas acceptés",
  smokeRule: "il est interdit de fumer",
  meter: "m",
  intro: ({ name, typeLabel, location, plan, audience, guests }) =>
    `<p><strong>${name}</strong> est une ${typeLabel} à louer à ${location}, en Turquie. Le plan ${plan} propose ${audience}, avec de la place pour ${guests} voyageurs.</p>`,
  concept: (typeLabel, features) =>
    `<p>Cette ${typeLabel} se distingue par ${features}. La maison convient à qui veut des vacances au calme plutôt qu'une chambre d'hôtel.</p>`,
  interior: (features, bedrooms, bathrooms) =>
    `<p>À l'intérieur, ${features} couvrent le quotidien. ${bedrooms} chambres et ${bathrooms} salles de bain gardent un plan clair pour un couple ou un groupe.</p>`,
  exterior: (features) =>
    `<p>Dehors, ${features} permettent de rester dans la propriété. L'espace extérieur privé compte lorsque la piscine vous est réservée.</p>`,
  standout: (feature, typeLabel) =>
    `<p>${feature} distingue cette ${typeLabel} des locations voisines, pour une semaine au soleil d'hiver ou un séjour en famille plus long.</p>`,
  rules: (rules) =>
    `<p>Règles de la maison : ${rules}. Lisez-les avant de réserver.</p>`,
  distance: (phrases) => `Pour les distances, comptez ${phrases}.`,
  distanceAbout: (name, distance) => `${name} à environ ${distance}`,
  distanceTail: (locationNote) =>
    locationNote.trim()
      ? ` ${locationNote.trim()}`
      : " Commerces et restaurants à proximité évitent un long trajet pour les repas.",
  minStay: (nights) =>
    `<p>Le séjour minimum est de ${nights} nuits, ce qui correspond à des vacances prévues plutôt qu'à une seule nuit.</p>`,
  closing: ({ location, guests, typeLabel, features, name }) =>
    `<p>Cette ${typeLabel} pour ${guests} voyageurs à ${location} est prévue pour des vacances en Turquie avec ${features}. Pour comparer ${name}, regardez ensemble la piscine, le transfert et le séjour minimum.</p>`,
};

const es: VillaDescriptionCopy = {
  and: "y",
  coupleStay: "una estancia pensada para parejas",
  groupStay: (guests) => `una estancia cómoda para ${guests} huéspedes`,
  childRule: "no se admiten niños",
  petRule: "no se admiten mascotas",
  smokeRule: "no se puede fumar",
  meter: "m",
  intro: ({ name, typeLabel, location, plan, audience, guests }) =>
    `<p><strong>${name}</strong> es una ${typeLabel} de alquiler en ${location}, Turquía. La distribución ${plan} ofrece ${audience}, con espacio para ${guests} huéspedes.</p>`,
  concept: (typeLabel, features) =>
    `<p>Esta ${typeLabel} se distingue por ${features}. La casa está pensada para quien busca unas vacaciones tranquilas en Turquía y no una habitación de hotel.</p>`,
  interior: (features, bedrooms, bathrooms) =>
    `<p>En el interior, ${features} cubren el día a día. ${bedrooms} dormitorios y ${bathrooms} baños mantienen una distribución clara para una pareja o un grupo.</p>`,
  exterior: (features) =>
    `<p>En el exterior, ${features} permiten quedarse en la propiedad. El espacio privado importa cuando la piscina es solo para ustedes.</p>`,
  standout: (feature, typeLabel) =>
    `<p>${feature} separa esta ${typeLabel} de alquileres parecidos, tanto para una semana de sol en invierno como para una estancia familiar más larga.</p>`,
  rules: (rules) =>
    `<p>Normas de la casa: ${rules}. Léalas antes de reservar.</p>`,
  distance: (phrases) => `En distancias, cuente ${phrases}.`,
  distanceAbout: (name, distance) => `${name} a unos ${distance}`,
  distanceTail: (locationNote) =>
    locationNote.trim()
      ? ` ${locationNote.trim()}`
      : " Tiendas y restaurantes cercanos evitan un trayecto largo para comer.",
  minStay: (nights) =>
    `<p>La estancia mínima es de ${nights} noches, adecuada para unas vacaciones previstas y no para una sola noche.</p>`,
  closing: ({ location, guests, typeLabel, features, name }) =>
    `<p>Esta ${typeLabel} para ${guests} huéspedes en ${location} está preparada para unas vacaciones en Turquía con ${features}. Si compara ${name}, mire juntos la piscina, el traslado y la estancia mínima.</p>`,
};

const ru: VillaDescriptionCopy = {
  and: "и",
  coupleStay: "отдых для пары",
  groupStay: (guests) => `комфортный отдых для ${guests} гостей`,
  childRule: "дети не допускаются",
  petRule: "животные не допускаются",
  smokeRule: "курение запрещено",
  meter: "м",
  intro: ({ name, typeLabel, location, plan, audience, guests }) =>
    `<p><strong>${name}</strong> — ${typeLabel} в аренду в ${location}, Турция. Планировка ${plan} рассчитана на ${audience}, с местами для ${guests} гостей.</p>`,
  concept: (typeLabel, features) =>
    `<p>Эту ${typeLabel} выделяют ${features}. Дом для тех, кому нужен спокойный отдых в Турции, а не номер в отеле.</p>`,
  interior: (features, bedrooms, bathrooms) =>
    `<p>В доме для быта есть ${features}. ${bedrooms} спальни и ${bathrooms} ванные держат планировку понятной и для пары, и для компании.</p>`,
  exterior: (features) =>
    `<p>На участке остаются ${features}. Свой двор важен, когда бассейн только ваш.</p>`,
  standout: (feature, typeLabel) =>
    `<p>${feature} отличает эту ${typeLabel} от похожих домов — и для недели зимнего солнца, и для более долгого семейного отдыха.</p>`,
  rules: (rules) =>
    `<p>Правила дома: ${rules}. Прочитайте их до бронирования.</p>`,
  distance: (phrases) => `По расстояниям ориентируйтесь на ${phrases}.`,
  distanceAbout: (name, distance) => `${name} примерно ${distance}`,
  distanceTail: (locationNote) =>
    locationNote.trim()
      ? ` ${locationNote.trim()}`
      : " Магазины и рестораны рядом избавляют от дальней поездки за едой.",
  minStay: (nights) =>
    `<p>Минимальный срок — ${nights} ночей. Это формат запланированного отдыха, а не одной ночи.</p>`,
  closing: ({ location, guests, typeLabel, features, name }) =>
    `<p>Эта ${typeLabel} на ${guests} гостей в ${location} собрана для отдыха в Турции с ${features}. Сравнивая ${name}, смотрите вместе бассейн, время трансфера и минимальный срок.</p>`,
};

const bg: VillaDescriptionCopy = {
  ...en,
  and: "и",
  coupleStay: "престой за двойки",
  groupStay: (guests) => `комфортен престой за ${guests} гости`,
  childRule: "деца не се допускат",
  petRule: "домашни любимци не се допускат",
  smokeRule: "пушенето е забранено",
  meter: "м",
  intro: ({ name, typeLabel, location, plan, audience, guests }) =>
    `<p><strong>${name}</strong> е ${typeLabel} под наем в ${location}, Турция. Разпределението ${plan} предлага ${audience} и място за ${guests} гости.</p>`,
  concept: (typeLabel, features) =>
    `<p>Тази ${typeLabel} се отличава с ${features}. Къщата е за гости, които търсят спокоен отдих в Турция, а не хотелска стая.</p>`,
  interior: (features, bedrooms, bathrooms) =>
    `<p>Вътре ${features} покриват ежедневието. ${bedrooms} спални и ${bathrooms} бани държат плана ясен за двойка или по-голяма група.</p>`,
  exterior: (features) =>
    `<p>Отвън ${features} оставят почивката в имота. Частното пространство е важно, когато басейнът е само ваш.</p>`,
  standout: (feature, typeLabel) =>
    `<p>${feature} отличава тази ${typeLabel} от подобни наеми, за седмица зимно слънце или по-дълъг семеен престой.</p>`,
  rules: (rules) =>
    `<p>Правила на къщата: ${rules}. Прочетете ги преди резервация.</p>`,
  distance: (phrases) => `За разстояния разчитайте на ${phrases}.`,
  distanceAbout: (name, distance) => `${name} на около ${distance}`,
  distanceTail: (locationNote) =>
    locationNote.trim()
      ? ` ${locationNote.trim()}`
      : " Магазини и ресторанти наблизо спестяват дълъг път за храна.",
  minStay: (nights) =>
    `<p>Минималният престой е ${nights} нощи и подхожда на планирана почивка, не на една нощувка.</p>`,
  closing: ({ location, guests, typeLabel, features, name }) =>
    `<p>Тази ${typeLabel} за ${guests} гости в ${location} е подготвена за почивка в Турция с ${features}. Когато сравнявате ${name}, гледайте заедно басейна, трансфера и минималния престой.</p>`,
};

const el: VillaDescriptionCopy = {
  ...en,
  and: "και",
  coupleStay: "μια διαμονή για ζευγάρια",
  groupStay: (guests) => `μια άνετη διαμονή για ${guests} επισκέπτες`,
  childRule: "δεν επιτρέπονται παιδιά",
  petRule: "δεν επιτρέπονται κατοικίδια",
  smokeRule: "δεν επιτρέπεται το κάπνισμα",
  meter: "μ.",
  intro: ({ name, typeLabel, location, plan, audience, guests }) =>
    `<p>Η <strong>${name}</strong> είναι ${typeLabel} προς ενοικίαση στην περιοχή ${location}, στην Τουρκία. Η διάταξη ${plan} προσφέρει ${audience}, με χώρο για ${guests} επισκέπτες.</p>`,
  concept: (typeLabel, features) =>
    `<p>Αυτή η ${typeLabel} ξεχωρίζει με ${features}. Το σπίτι είναι για όσους θέλουν ήσυχες διακοπές στην Τουρκία και όχι δωμάτιο ξενοδοχείου.</p>`,
  interior: (features, bedrooms, bathrooms) =>
    `<p>Μέσα, ${features} καλύπτουν την καθημερινότητα. ${bedrooms} υπνοδωμάτια και ${bathrooms} μπάνια κρατούν τη διάταξη σαφή για ζευγάρι ή μεγαλύτερη παρέα.</p>`,
  exterior: (features) =>
    `<p>Έξω, ${features} κρατούν τις διακοπές στο οικόπεδο. Ο ιδιωτικός χώρος μετρά όταν η πισίνα είναι δική σας.</p>`,
  standout: (feature, typeLabel) =>
    `<p>Το ${feature} ξεχωρίζει αυτή την ${typeLabel} από παρόμοιες ενοικιάσεις, είτε για μια εβδομάδα χειμερινού ήλιου είτε για μεγαλύτερη οικογενειακή διαμονή.</p>`,
  rules: (rules) =>
    `<p>Κανόνες σπιτιού: ${rules}. Διαβάστε τους πριν την κράτηση.</p>`,
  distance: (phrases) => `Για τις αποστάσεις υπολογίστε ${phrases}.`,
  distanceAbout: (name, distance) => `${name} περίπου ${distance}`,
  distanceTail: (locationNote) =>
    locationNote.trim()
      ? ` ${locationNote.trim()}`
      : " Καταστήματα και εστιατόρια κοντά γλιτώνουν μια μεγάλη διαδρομή για φαγητό.",
  minStay: (nights) =>
    `<p>Η ελάχιστη διαμονή είναι ${nights} διανυκτερεύσεις και ταιριάζει σε προγραμματισμένες διακοπές, όχι σε μία νύχτα.</p>`,
  closing: ({ location, guests, typeLabel, features, name }) =>
    `<p>Αυτή η ${typeLabel} για ${guests} επισκέπτες στην περιοχή ${location} είναι για διακοπές στην Τουρκία με ${features}. Συγκρίνοντας το ${name}, δείτε μαζί την πισίνα, τη μεταφορά και την ελάχιστη διαμονή.</p>`,
};

const zh: VillaDescriptionCopy = {
  ...en,
  and: "和",
  coupleStay: "适合情侣的入住",
  groupStay: (guests) => `适合 ${guests} 位客人的舒适入住`,
  childRule: "不接待儿童",
  petRule: "不接待宠物",
  smokeRule: "禁止吸烟",
  meter: "米",
  intro: ({ name, typeLabel, location, plan, audience, guests }) =>
    `<p><strong>${name}</strong> 是土耳其${location}的出租${typeLabel}。${plan} 户型提供${audience}，可住 ${guests} 位客人。</p>`,
  concept: (typeLabel, features) =>
    `<p>这栋${typeLabel}的区别在于${features}。房子适合想在土耳其安静度假、而不是住酒店的客人。</p>`,
  interior: (features, bedrooms, bathrooms) =>
    `<p>室内有${features}，照顾日常起居。${bedrooms} 间卧室和 ${bathrooms} 间浴室让情侣或多人同行都清楚。</p>`,
  exterior: (features) =>
    `<p>户外有${features}，假期可以留在物业内。泳池只供住客使用时，私人户外空间很重要。</p>`,
  standout: (feature, typeLabel) =>
    `<p>${feature} 让这栋${typeLabel}不同于同类出租屋，无论是一周冬日阳光还是更长的家庭入住。</p>`,
  rules: (rules) => `<p>入住规则：${rules}。预订前请先阅读。</p>`,
  distance: (phrases) => `距离上请按${phrases}来安排。`,
  distanceAbout: (name, distance) => `${name}约 ${distance}`,
  distanceTail: (locationNote) =>
    locationNote.trim()
      ? ` ${locationNote.trim()}`
      : " 附近有商店和餐厅，吃饭不必走很远。",
  minStay: (nights) =>
    `<p>最少入住 ${nights} 晚，适合一次完整假期，而不是只住一晚。</p>`,
  closing: ({ location, guests, typeLabel, features, name }) =>
    `<p>${location}这栋可住 ${guests} 人的${typeLabel}，按带有${features}的土耳其别墅假期来安排。比较 ${name} 时，请同时看泳池、接送时间和最少入住晚数。</p>`,
};

const COPY: Record<string, VillaDescriptionCopy> = {
  tr,
  en,
  de,
  fr,
  es,
  bg,
  el,
  zh,
  ru,
};

export function villaDescriptionCopy(locale: string): VillaDescriptionCopy {
  return COPY[locale] ?? en;
}
