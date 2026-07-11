"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Building2,
  FileText,
  HelpCircle,
  Megaphone,
  Menu,
  MessageSquare,
} from "lucide-react";
import FaqManagement from "@/components/admin/content/FaqManagement";
import BlogManagement from "@/components/admin/content/BlogManagement";
import ReviewManagement from "@/components/admin/content/ReviewManagement";
import CorporatePageManagement from "@/components/admin/content/CorporatePageManagement";
import MenuManagement from "@/components/admin/content/MenuManagement";
import CampaignManagement from "@/components/admin/content/CampaignManagement";

const tabs = [
  { id: "sss", label: "Sık Sorulan Sorular", icon: HelpCircle },
  { id: "blog", label: "Blog", icon: BookOpen },
  { id: "yorumlar", label: "Misafir Yorumları", icon: MessageSquare },
  { id: "kurumsal", label: "Kurumsal", icon: Building2 },
  { id: "menuler", label: "Menüler", icon: Menu },
  { id: "kampanyalar", label: "Kampanyalar", icon: Megaphone },
] as const;

type TabId = (typeof tabs)[number]["id"];

function isValidTabId(value: string | undefined): value is TabId {
  return tabs.some((tab) => tab.id === value);
}

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
type Review = React.ComponentProps<typeof ReviewManagement>["reviews"][number];
type CmsPage = React.ComponentProps<typeof CorporatePageManagement>["pages"][number];
type SiteMenu = React.ComponentProps<typeof MenuManagement>["menus"][number];
type Campaign = React.ComponentProps<typeof CampaignManagement>["campaigns"][number];

interface ContentManagementProps {
  initialTab?: string;
  faqs: FaqItem[];
  blogCategories: BlogCategory[];
  blogPosts: BlogPost[];
  reviews: Review[];
  pages: CmsPage[];
  menus: SiteMenu[];
  campaigns: Campaign[];
}

export default function ContentManagement({
  initialTab,
  faqs,
  blogCategories,
  blogPosts,
  reviews,
  pages,
  menus,
  campaigns,
}: ContentManagementProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>(
    isValidTabId(initialTab) ? initialTab : "sss"
  );

  useEffect(() => {
    if (isValidTabId(initialTab) && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, activeTab]);

  function selectTab(tabId: TabId) {
    setActiveTab(tabId);
    router.replace(`/admin/icerik?tab=${tabId}`, { scroll: false });
  }

  const activeMeta = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="flex h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden lg:h-[calc(100dvh-4rem)]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">İçerik Yönetimi</h1>
              {activeMeta ? (
                <p className="mt-0.5 text-sm text-gray-500">{activeMeta.label}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-b border-gray-100 px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <TabPanel active={activeTab === "sss"}>
            <FaqManagement items={faqs} />
          </TabPanel>
          <TabPanel active={activeTab === "blog"}>
            <BlogManagement categories={blogCategories} posts={blogPosts} />
          </TabPanel>
          <TabPanel active={activeTab === "yorumlar"}>
            <ReviewManagement reviews={reviews} />
          </TabPanel>
          <TabPanel active={activeTab === "kurumsal"}>
            <CorporatePageManagement pages={pages} />
          </TabPanel>
          <TabPanel active={activeTab === "menuler"}>
            <MenuManagement menus={menus} />
          </TabPanel>
          <TabPanel active={activeTab === "kampanyalar"}>
            <CampaignManagement campaigns={campaigns} />
          </TabPanel>
        </div>
      </div>
    </div>
  );
}
