(() => {
  const phrases = {
    en: [
      ["Hindistan Cevizi", "Coconut"],
      ["Aromalı Likör", "Flavoured Liqueur"],
      ["Brüt Şampanya", "Brut Champagne"],
      ["dinlendirilmemiş", "unaged"],
      ["Amerikan meşe", "American oak"],
      ["uzun fıçı", "long cask ageing"],
      ["14 ay fıçı", "14 months in cask"],
      ["8 ay fıçı", "8 months in cask"],
      ["Acıbadem", "Amaretto"],
      ["Vişne", "Sour Cherry"],
      ["Şeftali", "Peach"],
      ["Portakal", "Orange"],
      ["Kayısı", "Apricot"],
      ["Çilek", "Strawberry"],
      ["Kavun", "Melon"],
      ["Kahve", "Coffee"],
      ["Nane", "Mint"],
      ["Muz", "Banana"],
      ["İskoçya", "Scotland"],
      ["Meksika", "Mexico"],
      ["Şarap", "Wine"],
      ["Viski", "Whisky"],
      ["Tekila", "Tequila"],
      ["Rom", "Rum"],
    ],
    ar: [
      ["Hindistan Cevizi", "جوز الهند"],
      ["Aromalı Likör", "ليكور منكه"],
      ["Brüt Şampanya", "شامبانيا بروت"],
      ["dinlendirilmemiş", "غير معتّق"],
      ["Amerikan meşe", "بلوط أمريكي"],
      ["uzun fıçı", "تعتيق طويل"],
      ["14 ay fıçı", "14 شهراً في البرميل"],
      ["8 ay fıçı", "8 أشهر في البرميل"],
      ["Acıbadem", "أماريتو"],
      ["Vişne", "كرز حامض"],
      ["Şeftali", "خوخ"],
      ["Portakal", "برتقال"],
      ["Kayısı", "مشمش"],
      ["Çilek", "فراولة"],
      ["Kavun", "شمام"],
      ["Kahve", "قهوة"],
      ["Nane", "نعناع"],
      ["Muz", "موز"],
      ["İskoçya", "اسكتلندا"],
      ["Meksika", "المكسيك"],
      ["Şarap", "نبيذ"],
      ["Viski", "ويسكي"],
      ["Tekila", "تيكيلا"],
      ["Rom", "روم"],
    ],
  };

  function localize(lang, text) {
    const list = phrases[lang];
    if (!list || text == null) return text || "";
    let out = String(text);
    for (const [from, to] of list) {
      if (out.includes(from)) out = out.split(from).join(to);
    }
    return out;
  }

  window.HavannaLabels = { localize };
})();
