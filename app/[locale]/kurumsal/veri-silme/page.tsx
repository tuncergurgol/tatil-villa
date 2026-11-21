import type { Metadata } from "next";
import Link from "next/link";
import { getDataDeletionPageContent } from "@/lib/data-deletion-page";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Kullanıcı Verisi Silme Talebi",
    description:
      "Facebook ve Instagram reklam formlarından paylaştığınız kişisel verilerin silinmesini nasıl talep edebileceğinizi öğrenin.",
    robots: { index: true, follow: true },
  };
}

export default async function DataDeletionPage() {
  const { brand, companyTitle, email, domain } = await getDataDeletionPageContent();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <article className="rounded-3xl border border-slate-200/80 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-9">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Kullanıcı Verisi Silme Talebi
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {companyTitle} — {brand}
        </p>

        <div className="prose prose-teal mt-8 max-w-none prose-headings:text-slate-900">
          <p>
            Facebook veya Instagram reklam formları (Lead Ads) aracılığıyla paylaştığınız
            kişisel verilerin silinmesini talep edebilirsiniz.
          </p>

          <h2>Nasıl talep edilir?</h2>
          <ol>
            <li>
              <a href={`mailto:${email}`}>{email}</a> adresine e-posta gönderin.
            </li>
            <li>Konu satırına <strong>Veri Silme Talebi</strong> yazın.</li>
            <li>
              Mesajınızda ad-soyadınızı ve reklam formunda kullandığınız e-posta veya telefon
              numarasını belirtin.
            </li>
          </ol>

          <p>
            Alternatif olarak{" "}
            <Link href="/kurumsal/iletisim">iletişim sayfamız</Link> üzerinden de başvurabilirsiniz.
          </p>

          <h2>İşlem süresi</h2>
          <p>
            Talebiniz kimlik doğrulaması sonrası en geç 30 gün içinde sonuçlandırılır. Silme
            işlemi tamamlandığında e-posta ile bilgilendirilirsiniz.
          </p>

          <h2>Gizlilik politikası</h2>
          <p>
            Detaylı bilgi için{" "}
            <Link href="/meta/gizlilik-politikasi">gizlilik politikamıza</Link> bakabilirsiniz.
          </p>

          <p className="text-sm text-slate-500">
            <a href={`https://${domain}`}>{domain}</a>
          </p>
        </div>
      </article>
    </div>
  );
}
