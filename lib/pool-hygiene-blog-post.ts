export const POOL_HYGIENE_BLOG_POST = {
  slug: "yuzme-havuzu-sicaklik-ve-hijyen-standartlari",
  title: "Yüzme Havuzlarında Sıcaklık ve Hijyen Standartları",
  categorySlug: "tatil-ipuclari",
  excerpt:
    "Genel kullanıma açık yüzme havuzlarında su sıcaklığının 26-28 °C aralığında tutulmasının sağlık ve hijyen gerekçesi.",
  seoTitle: "Yüzme Havuzu Sıcaklık ve Hijyen Standartları | Tatildeyiz",
  seoDescription:
    "Sağlık Bakanlığı yüzme havuzu yönetmeliğine göre genel havuzlarda 26-28 °C sıcaklık standardı, 28 °C üzerinin riskleri ve villa havuzlarındaki uygulama.",
  seoKeywords:
    "yüzme havuzu sıcaklığı, havuz hijyeni, 26-28 derece, villa havuzu, Sağlık Bakanlığı havuz yönetmeliği",
} as const;

export function buildPoolHygieneBlogHtml() {
  return `<p>Türkiye’de yüzme havuzlarının sağlık ve hijyen şartları, Sağlık Bakanlığı tarafından yayımlanan <strong>Yüzme Havuzlarının Tabi Olacağı Sağlık Esasları ve Şartları Hakkında Yönetmelik</strong> ve bu yönetmeliğe bağlı genelge ile ekler kapsamında düzenlenir.</p>
<p>Bu mevzuat kapsamında yapılan inceleme ve değerlendirme aşağıdadır.</p>
<h2>1. Sıcaklık standardı doğru mu?</h2>
<p>Evet. Yönetmelik standardına göre doğrudur.</p>
<p>Sağlık Bakanlığı’nın ilgili yönetmeliğine (Ek-1: Kimyasal Özellikler) göre genel kullanıma açık yüzme havuzlarında su sıcaklığının <strong>26 °C ile 28 °C</strong> arasında olması öngörülür.</p>
<ul>
  <li><strong>Genel ve kapalı yüzme havuzları:</strong> Yönetmelikte ideal ve izin verilen üst limit aralığı 26-28 °C olarak tanımlanmıştır.</li>
  <li><strong>Terapi, medikal ve kaplıca havuzları:</strong> Tedavi ve terapi amaçlı havuzlar bu genel hıfzıssıhha sınırlamasından muaf tutulabilir. Sıcaklıkları 34-38 °C seviyelerine kadar çıkabilir.</li>
</ul>
<h2>2. 28 derecenin üzerine çıkılması neden istenmez?</h2>
<p>Havuz suyunun 28 °C üzerine çıkarılması, halk sağlığı ve havuz hijyeni açısından önemli riskler doğurur.</p>
<ul>
  <li><strong>Bakteri ve mantar üremesi:</strong> Yüksek su sıcaklıkları, özellikle 30 °C ve üzeri, Legionella, Pseudomonas aeruginosa ve çeşitli mantar ile bakterilerin üremesi için elverişli bir ortam yaratır.</li>
  <li><strong>Klorun etkisini yitirmesi:</strong> Sıcaklık arttıkça sudaki serbest klor gazlaşarak daha hızlı uçar. Dezenfeksiyon zayıflar ve sudaki kloramin oranı artar.</li>
  <li><strong>Cilt ve solunum hassasiyeti:</strong> Sıcak su ile yüksek klor birleşimi göz, cilt ve solunum yolu irritasyonlarına neden olabilir.</li>
</ul>
<h2>3. Villa ve turizm işletmelerinde durum</h2>
<p>Ticari villa kiralama ve turizm tesislerindeki kapalı veya açık ısıtmalı havuzlarda kullanıcılar genellikle 30-32 °C bandında daha sıcak bir su bekler.</p>
<p>Sağlık Bakanlığı denetimine tabi ticari işletmelerde ve ruhsatlı tesislerde yasal denetim kısıtları ile hijyen gereksinimleri nedeniyle sıcaklık <strong>28 °C</strong> seviyesinde tutulur.</p>`;
}
