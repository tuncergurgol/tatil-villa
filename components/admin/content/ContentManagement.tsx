"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Pencil, Plus } from "lucide-react";
import FaqManagement from "@/components/admin/content/FaqManagement";
import BlogManagement from "@/components/admin/content/BlogManagement";
import ReviewManagement from "@/components/admin/content/ReviewManagement";
import CorporatePageManagement from "@/components/admin/content/CorporatePageManagement";
import MenuManagement from "@/components/admin/content/MenuManagement";
import CampaignManagement from "@/components/admin/content/CampaignManagement";
import ContentTabDefinitionModal, {
  type ContentTabDefinition,
} from "@/components/admin/content/ContentTabDefinitionModal";

function TabPanel({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={active ? "block" : "hidden"} aria-hidden={!active}>
      {children}
    </div>
  );
}

type FaqItem = React.ComponentProps<typeof FaqManagement>["items"][number];
type BlogCategory = React.ComponentProps<typeof BlogManagement>["categories"][number];
type BlogPost = React.ComponentProps<typeof BlogManagement>["posts"][number];
type BlogAiSettings = React.ComponentProps<typeof BlogManagement>["blogAiSettings"];
type BlogAiTopic = React.ComponentProps<typeof BlogManagement>["blogAiTopics"][number];
type Review = React.ComponentProps<typeof ReviewManagement>["reviews"][number];
type CmsPage = React.ComponentProps<typeof CorporatePageManagement>["pages"][number];
type SiteMenu = React.ComponentProps<typeof MenuManagement>["menus"][number];
type Campaign = React.ComponentProps<typeof CampaignManagement>["campaigns"][number];

interface ContentManagementProps {
  initialTab?: string;
  contentTabs: ContentTabDefinition[];
  faqs: FaqItem[];
  blogCategories: BlogCategory[];
  blogPosts: BlogPost[];
  blogAiSettings: BlogAiSettings;
  blogAiTopics: BlogAiTopic[];
  reviews: Review[];
  pages: CmsPage[];
  menus: SiteMenu[];
  campaigns: Campaign[];
}

export default function ContentManagement({
  initialTab,
  contentTabs,
  faqs,
  blogCategories,
  blogPosts,
  blogAiSettings,
  blogAiTopics,
  reviews,
  pages,
  menus,
  campaigns,
}: ContentManagementProps) {
  const router = useRouter();
  const sortedTabs = useMemo(
    () =>
      [...contentTabs].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "tr")
      ),
    [contentTabs]
  );

  const fallbackKey = sortedTabs[0]?.key ?? "sss";

  const [activeTabKey, setActiveTabKey] = useState(() => {
    if (initialTab && sortedTabs.some((tab) => tab.key === initialTab)) {
      return initialTab;
    }
    return fallbackKey;
  });

  const [tabModal, setTabModal] = useState<
    | { mode: "create" }
    | { mode: "edit"; tab: ContentTabDefinition }
    | null
  >(null);

  useEffect(() => {
    if (initialTab && sortedTabs.some((tab) => tab.key === initialTab)) {
      setActiveTabKey(initialTab);
      return;
    }
    if (!sortedTabs.some((tab) => tab.key === activeTabKey)) {
      setActiveTabKey(fallbackKey);
    }
  }, [initialTab, sortedTabs, activeTabKey, fallbackKey]);

  function selectTab(tabKey: string) {
    setActiveTabKey(tabKey);
    router.replace(`/admin/icerik?tab=${tabKey}`, { scroll: false });
  }

  const activeTab = sortedTabs.find((tab) => tab.key === activeTabKey);
  const activeModule = activeTab?.moduleKey ?? activeTabKey;

  return (
    <div className="flex h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden lg:h-[calc(100dvh-4rem)]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">İçerik Yönetimi</h1>
              <p className="mt-0.5 text-sm text-gray-500">
                Site içeriklerini sekme üzerinden yönetin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTabModal({ mode: "create" })}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Yeni Sekme Ekle
          </button>
        </div>

        <div className="shrink-0 border-b border-gray-200 bg-white px-6">
          <div className="flex flex-wrap items-end gap-1">
            {sortedTabs.map((tab) => {
              const isSelected = activeTabKey === tab.key;
              return (
                <div key={tab.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => selectTab(tab.key)}
                    className={`cursor-pointer border-b-2 px-3 py-4 text-sm font-medium transition ${
                      isSelected
                        ? "border-teal-600 text-teal-700"
                        : "border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-700"
                    } ${!tab.active ? "opacity-50" : ""}`}
                  >
                    {tab.name}
                    {!tab.active ? (
                      <span className="ml-1 text-[10px] font-semibold uppercase text-slate-400">
                        Pasif
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTabModal({ mode: "edit", tab })}
                    aria-label={`${tab.name} sekmesini düzenle`}
                    title="Sekmeyi düzenle"
                    className="mb-3 ml-0.5 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-teal-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <TabPanel active={activeModule === "sss"}>
            <FaqManagement items={faqs} />
          </TabPanel>
          <TabPanel active={activeModule === "blog"}>
            <BlogManagement
              categories={blogCategories}
              posts={blogPosts}
              blogAiSettings={blogAiSettings}
              blogAiTopics={blogAiTopics}
            />
          </TabPanel>
          <TabPanel active={activeModule === "yorumlar"}>
            <ReviewManagement reviews={reviews} />
          </TabPanel>
          <TabPanel active={activeModule === "kurumsal"}>
            <CorporatePageManagement pages={pages} />
          </TabPanel>
          <TabPanel active={activeModule === "menuler"}>
            <MenuManagement menus={menus} />
          </TabPanel>
          <TabPanel active={activeModule === "kampanyalar"}>
            <CampaignManagement campaigns={campaigns} />
          </TabPanel>
          <TabPanel
            active={
              ![
                "sss",
                "blog",
                "yorumlar",
                "kurumsal",
                "menuler",
                "kampanyalar",
              ].includes(activeModule)
            }
          >
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
              <p className="text-sm font-medium text-gray-700">
                Bu sekme için henüz içerik paneli bağlanmadı.
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Sekme adı ve sırasını düzenleyebilirsiniz.
              </p>
            </div>
          </TabPanel>
        </div>
      </div>

      <ContentTabDefinitionModal
        open={Boolean(tabModal)}
        mode={tabModal?.mode === "edit" ? "edit" : "create"}
        tab={tabModal?.mode === "edit" ? tabModal.tab : null}
        onClose={() => setTabModal(null)}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
