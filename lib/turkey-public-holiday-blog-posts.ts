import {
  formatTurkeyHolidayDate,
  getTurkeyPublicHolidayDatesForYear,
  getTurkeyPublicHolidaysForYear,
  getTurkeyPublicHolidaysOnDate,
  TURKEY_HOLIDAY_TYPE_PAGES,
  TURKEY_HOLIDAY_YEAR_END,
  weekdayNameTr,
  type TurkeyHolidayKind,
  type TurkeyPublicHoliday,
} from "@/lib/turkey-public-holidays";

export const TURKEY_HOLIDAY_BLOG_CATEGORY = {
  name: "Resmi Tatiller",
  slug: "resmi-tatiller",
  description:
    "Türkiye resmi tatil günleri, bayram tarihleri ve villa tatili planlama rehberi",
  sortOrder: 5,
};

export type TurkeyHolidayBlogPostSeed = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  publishedAt: Date;
};

const BLOG_YEAR_START = 2026;
const YEAR_RANGE_LABEL = `${BLOG_YEAR_START}–${TURKEY_HOLIDAY_YEAR_END}`;

function uniqueDateRows(holidays: TurkeyPublicHoliday[]) {
  const byDate = new Map<string, TurkeyPublicHoliday[]>();
  for (const holiday of holidays) {
    const list = byDate.get(holiday.date) ?? [];
    list.push(holiday);
    byDate.set(holiday.date, list);
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function holidayTable(rows: Array<[string, TurkeyPublicHoliday[]]>) {
  const body = rows
    .map(([date, items]) => {
      const names = items
        .map((item) =>
          item.halfDay ? `${item.name} (yarım gün)` : item.name
        )
        .join(" / ");
      const duration = items.some((item) => !item.halfDay)
        ? "Tam gün"
        : "Yarım gün";
      return `<tr><td>${formatTurkeyHolidayDate(date)}</td><td>${names}</td><td>${duration}</td></tr>`;
    })
    .join("");
  return `<table><thead><tr><th>Tarih</th><th>Tatil</th><th>Süre</th></tr></thead><tbody>${body}</tbody></table>`;
}

function longWeekendTips(year: number) {
  const dates = getTurkeyPublicHolidayDatesForYear(year);
  const tips: string[] = [];
  for (const date of dates) {
    const weekday = weekdayNameTr(date);
    const names = getTurkeyPublicHolidaysOnDate(date)
      .map((item) => item.shortName)
      .join(" / ");
    if (weekday === "Cuma" || weekday === "Pazartesi") {
      tips.push(
        `<li><strong>${names}</strong> ${weekday} gününe denk geliyor; hafta sonuyla birleşince villa konaklaması için doğal bir uzatma oluşur.</li>`
      );
    } else if (weekday === "Perşembe") {
      tips.push(
        `<li><strong>${names}</strong> Perşembe; Cuma izinle 4 gecelik bir kaçış planlanabilir.</li>`
      );
    } else if (weekday === "Salı") {
      tips.push(
        `<li><strong>${names}</strong> Salı; Pazartesi izinle uzun bir tatil penceresi açılabilir.</li>`
      );
    }
  }
  if (tips.length === 0) {
    return "<p>Bu yıl resmi tatiller hafta içine dağılıyor. Kısa kaçışlar için cuma giriş–pazar çıkış yerine bayram aralıklarını öne almak daha verimli olur.</p>";
  }
  return `<ul>${tips.slice(0, 6).join("")}</ul>`;
}

function ramadanSummary(year: number) {
  const days = getTurkeyPublicHolidaysForYear(year).filter(
    (item) => item.kind === "RAMADAN" || item.kind === "RAMADAN_EVE"
  );
  if (days.length === 0) {
    return `<p>${year} yılında Ramazan Bayramı bu miladi yıla sığmıyor; bir önceki veya sonraki yılın yazısına bakın.</p>`;
  }
  const first = days.find((item) => item.kind === "RAMADAN" && item.dayIndex === 1);
  const last = days.find((item) => item.kind === "RAMADAN" && item.dayIndex === 3);
  const eve = days.find((item) => item.kind === "RAMADAN_EVE");
  return `<p>Ramazan Bayramı ${year} yılında ${first ? formatTurkeyHolidayDate(first.date) : ""} tarihinde başlar${last ? ` ve ${formatTurkeyHolidayDate(last.date)} tarihine kadar sürer` : ""}. ${eve ? `Arife günü ${formatTurkeyHolidayDate(eve.date)} öğleden sonra yarım gün resmi tatildir.` : ""} Kanun gereği Ramazan Bayramı, arefe günü saat 13.00’ten itibaren 3,5 gündür.</p>`;
}

function sacrificeSummary(year: number) {
  const days = getTurkeyPublicHolidaysForYear(year).filter(
    (item) => item.kind === "SACRIFICE" || item.kind === "SACRIFICE_EVE"
  );
  if (days.length === 0) {
    return `<p>${year} yılında Kurban Bayramı bu miladi yıla sığmıyor.</p>`;
  }
  const firsts = days.filter((item) => item.kind === "SACRIFICE" && item.dayIndex === 1);
  const blocks = firsts.map((first) => {
    const last = days.find(
      (item) =>
        item.kind === "SACRIFICE" &&
        item.dayIndex === 4 &&
        item.date >= first.date
    );
    return `${formatTurkeyHolidayDate(first.date)}${last ? ` – ${formatTurkeyHolidayDate(last.date)}` : ""}`;
  });
  return `<p>Kurban Bayramı ${year} yılında ${blocks.join(" ve ")} aralığında resmi tatildir. Arefe günü saat 13.00’ten itibaren 4,5 gün tatil uygulanır. Villa rezervasyonunda giriş–çıkış günlerini bayram trafiğine göre bir gün kaydırmak sakin bir teslimat sağlar.</p>`;
}

function buildYearlyPost(year: number): TurkeyHolidayBlogPostSeed {
  const holidays = getTurkeyPublicHolidaysForYear(year);
  const rows = uniqueDateRows(holidays);
  const ramadan = holidays.find((item) => item.kind === "RAMADAN" && item.dayIndex === 1);
  const sacrifice = holidays.find(
    (item) => item.kind === "SACRIFICE" && item.dayIndex === 1
  );

  const content = `<p>${year} yılı Türkiye resmi tatil günleri, villa kiralama ve kısa kaçış planı yapanlar için net bir takvim sunar. Ulusal bayramlar her yıl aynı tarihe denk gelir; Ramazan ve Kurban Bayramı ise hicri takvime göre kayar. Aşağıdaki liste, 2429 sayılı kanun kapsamındaki genel tatil günlerini ${year} miladi yılı için bir araya getirir.</p>
<h2>${year} resmi tatil takvimi</h2>
<p>Tabloda tam gün ve yarım gün (arefe) tatiller ayrı ayrı gösterilir. Aynı güne iki bayram denk gelirse her iki ad da yer alır.</p>
${holidayTable(rows)}
<h2>Ulusal ve resmi bayramlar</h2>
<p>1 Ocak Yılbaşı, 23 Nisan Ulusal Egemenlik ve Çocuk Bayramı, 1 Mayıs Emek ve Dayanışma Günü, 19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı, 15 Temmuz Demokrasi ve Millî Birlik Günü, 30 Ağustos Zafer Bayramı ile 29 Ekim Cumhuriyet Bayramı ${year} yılında da sabittir. Cumhuriyet Bayramı 28 Ekim öğleden sonra başlayan 1,5 günlük tatildir.</p>
<h3>Hafta içi dağılım</h3>
<p>Sabit bayramların haftanın hangi gününe denk geldiği, villa giriş–çıkış gününü ve fiyatı etkiler. Cuma veya pazartesiye denk gelen bir ulusal gün, iki gecelik bir kaçıışı dört güne yaklaştırabilir.</p>
<h2>Ramazan Bayramı ${year}</h2>
${ramadanSummary(year)}
<h2>Kurban Bayramı ${year}</h2>
${sacrificeSummary(year)}
<h2>${year} uzun hafta sonu ve villa planı</h2>
${longWeekendTips(year)}
<h2>Villa kiralarken dikkat edilecekler</h2>
<ul>
<li>Bayram öncesi Cuma ve bayram sonrası Pazar günleri check-in yoğunluğu artar; erken rezervasyon fiyatı kilitler.</li>
<li>Arefe yarım gün olsa da birçok aile o gün yola çıkar; Fethiye, Kalkan, Kaş ve Bodrum hatlarında teslim saatini esnek tutun.</li>
<li>Çocuklu gruplar 23 Nisan ve 19 Mayıs civarında havuzlu villa arar; kapasite ve bebek yatağı bilgisini önceden netleştirin.</li>
<li>Kurban ve Ramazan aralığında minimum konaklama kuralı değişebilir; takvimdeki gece sayısını rezervasyon özetinden doğrulayın.</li>
</ul>
<p>Dini bayramların kesin başlangıcı Diyanet İşleri Başkanlığı’nın hilal tespitine bağlıdır; ileri yıllarda bir gün kayma olabilir. Tatildeyiz takvimlerinde resmi tatil günleri mavi nokta ile işaretlenir; noktanın üzerine gelince tatilin adı görünür.</p>`;

  const ramadanBit = ramadan
    ? ` Ramazan Bayramı ${formatTurkeyHolidayDate(ramadan.date)}`
    : "";
  const sacrificeBit = sacrifice
    ? ` Kurban Bayramı ${formatTurkeyHolidayDate(sacrifice.date)}.`
    : ".";

  return {
    slug: `turkiye-resmi-tatil-gunleri-${year}`,
    title: `${year} Türkiye Resmi Tatil Günleri`,
    excerpt: `${year} resmi tatil takvimi: ulusal bayramlar,${ramadanBit}${sacrificeBit} Uzun hafta sonu ve villa tatili planı.`,
    content,
    seoTitle: `${year} Resmi Tatil Günleri | Türkiye Bayram Takvimi`,
    seoDescription: `${year} Türkiye resmi tatil günleri, Ramazan ve Kurban Bayramı tarihleri ve villa tatili için uzun hafta sonu önerileri.`,
    seoKeywords: `${year} resmi tatiller, ${year} ramazan bayramı, ${year} kurban bayramı, resmi tatil takvimi, villa tatili, bayram tatili`,
    publishedAt: new Date(Date.UTC(2026, 7, 28 - (year - 2026))),
  };
}

const TYPE_INTRO: Record<string, string> = {
  NEW_YEAR:
    "1 Ocak Yılbaşı, Türkiye'de genel tatil günüdür. Yılbaşı gecesi ve takip eden gün, havuzlu villa ve ısıtmalı konaklama arayanlar için sezonun sessiz ama talep gören pencerelerinden biridir.",
  NATIONAL_SOVEREIGNTY:
    "23 Nisan Ulusal Egemenlik ve Çocuk Bayramı, çocuklu ailelerin villa tatili için en çok aranan ilkbahar tarihlerinden biridir. Okul tatiliyle çakışınca Ege ve Akdeniz villalarında doluluk erken kapanır.",
  LABOR_DAY:
    "1 Mayıs Emek ve Dayanışma Günü, ilkbahar kaçıışı ve denize ilk giriş planları için kısa bir resmi tatil köprüsü sunar. Cuma veya pazartesiye denk geldiğinde villa rezervasyonu hızla dolar.",
  YOUTH_SPORTS:
    "19 Mayıs Atatürk'ü Anma, Gençlik ve Spor Bayramı, baharın en ferah günlerinden birine denk gelir. Spor, doğa ve havuzlu villa arayan gruplar bu tarihi uzun hafta sonuna çevirmeyi sever.",
  DEMOCRACY:
    "15 Temmuz Demokrasi ve Millî Birlik Günü, yaz ortasında sabit bir resmi tatildir. Yüksek sezon villalarında bu tarih civarı minimum konaklama ve fiyat kademesi değişebilir.",
  VICTORY:
    "30 Ağustos Zafer Bayramı, yazın son resmi köprüsüdür. Deniz suyu hâlâ sıcakken okul öncesi son kaçıış için Fethiye, Kalkan ve Bodrum villaları öne çıkar.",
  REPUBLIC:
    "29 Ekim Cumhuriyet Bayramı, 28 Ekim öğleden sonra başlayan 1,5 günlük resmi tatildir. Sonbahar villalarında sakinlik, ısıtmalı havuz ve uzun masa arayanlar için ideal bir penceredir.",
  RAMADAN:
    "Ramazan Bayramı (Şeker Bayramı) arefe günü saat 13.00’ten itibaren 3,5 gündür. Tarih her yıl yaklaşık 11 gün geriye kayar; 2040’a kadar tüm 1. günler aşağıda listelenir.",
  SACRIFICE:
    "Kurban Bayramı arefe günü saat 13.00’ten itibaren 4,5 gündür. Yılın en uzun dini resmi tatilidir; villa giriş–çıkış günü ve yol yoğunluğu bu aralıkta belirginleşir.",
};

function holidaysOfKind(kind: TurkeyHolidayKind) {
  const matches: TurkeyPublicHoliday[] = [];
  for (
    let year = BLOG_YEAR_START;
    year <= TURKEY_HOLIDAY_YEAR_END;
    year += 1
  ) {
    for (const holiday of getTurkeyPublicHolidaysForYear(year)) {
      if (kind === "REPUBLIC") {
        if (holiday.kind === "REPUBLIC" || holiday.kind === "REPUBLIC_EVE") {
          matches.push(holiday);
        }
        continue;
      }
      if (kind === "RAMADAN") {
        if (holiday.kind === "RAMADAN" || holiday.kind === "RAMADAN_EVE") {
          matches.push(holiday);
        }
        continue;
      }
      if (kind === "SACRIFICE") {
        if (holiday.kind === "SACRIFICE" || holiday.kind === "SACRIFICE_EVE") {
          matches.push(holiday);
        }
        continue;
      }
      if (holiday.kind === kind) matches.push(holiday);
    }
  }
  const seen = new Set<string>();
  return matches.filter((item) => {
    const key = `${item.date}:${item.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildTypePost(
  page: (typeof TURKEY_HOLIDAY_TYPE_PAGES)[number]
): TurkeyHolidayBlogPostSeed {
  const holidays = holidaysOfKind(page.kind);
  const firstDayOnly =
    page.kind === "RAMADAN" || page.kind === "SACRIFICE"
      ? holidays.filter((item) => item.dayIndex === 1 || item.halfDay)
      : holidays;
  const rows = uniqueDateRows(firstDayOnly);
  const intro = TYPE_INTRO[page.kind];

  const extra =
    page.kind === "RAMADAN"
      ? `<p>Ramazan Bayramı 1. günden itibaren 3 tam gün, arefe ise yarım gündür. İleri yıllardaki tarihler hilal gözlemine göre bir gün kayabilir; takvimdeki mavi nokta güncel resmi tatil işaretidir.</p>`
      : page.kind === "SACRIFICE"
        ? `<p>Kurban Bayramı 1. günden itibaren 4 tam gün, arefe yarım gündür. 2033 ve 2039 gibi yıllarda miladi takvime iki bayram sığabilir; tabloda her blok ayrı satırdadır.</p>`
        : `<p>${page.shortTitle} her yıl aynı miladi güne denk gelir. Değişen tek şey haftanın günüdür; bu da uzun hafta sonu ve villa fiyatını belirler.</p>`;

  const content = `<p>${intro}</p>
<h2>${page.shortTitle} ${YEAR_RANGE_LABEL} tarihleri</h2>
<p>Aşağıdaki tablo ${YEAR_RANGE_LABEL} aralığındaki resmi tatil günlerini gösterir.</p>
${holidayTable(rows)}
<h2>Villa tatili için ne anlama gelir?</h2>
${extra}
<ul>
<li>Giriş gününü tatilden bir gün önce, çıkışı tatilden bir gün sonra seçmek teslim kalabalığını azaltır.</li>
<li>Çocuklu aileler 23 Nisan, 19 Mayıs ve bayramlarda havuz, bahçe ve bebek yatağı arar.</li>
<li>Tatildeyiz takviminde bu günler mavi nokta ile işaretlenir; noktanın üzerine gelince tatilin adı çıkar.</li>
</ul>
<h3>Rezervasyon ipuçları</h3>
<p>${page.shortTitle} civarında popüler bölgelerde (Fethiye, Kalkan, Kaş, Bodrum, Çeşme) uygun villalar erken kapanır. Tarihi netleştirdikten sonra gece sayısı, temizlik günü ve hasar depozitosunu rezervasyon özetinden kontrol edin.</p>
<p>Kaynak çerçeve: 2429 sayılı Ulusal Bayram ve Genel Tatiller Hakkında Kanun. Dini bayramlar Diyanet açıklamasına bağlıdır.</p>`;

  return {
    slug: page.slug,
    title: `${page.title} (${YEAR_RANGE_LABEL})`,
    excerpt: `${page.shortTitle} resmi tatil tarihleri ${YEAR_RANGE_LABEL}: takvim, süre ve villa tatili planlama notları.`,
    content,
    seoTitle: `${page.shortTitle} Tatil Tarihleri ${YEAR_RANGE_LABEL}`,
    seoDescription: `${page.title} resmi tatil günleri ${YEAR_RANGE_LABEL}. Tarihler, süre ve villa kiralama önerileri.`,
    seoKeywords: `${page.shortTitle.toLocaleLowerCase("tr-TR")}, resmi tatil, ${page.slug.replaceAll("-", " ")}, villa tatili, bayram tatili`,
    publishedAt: new Date(Date.UTC(2026, 7, 20)),
  };
}

export function buildTurkeyHolidayBlogPosts(): TurkeyHolidayBlogPostSeed[] {
  const yearly = [];
  for (let year = BLOG_YEAR_START; year <= TURKEY_HOLIDAY_YEAR_END; year += 1) {
    yearly.push(buildYearlyPost(year));
  }
  const typed = TURKEY_HOLIDAY_TYPE_PAGES.map(buildTypePost);
  return [...yearly, ...typed];
}
