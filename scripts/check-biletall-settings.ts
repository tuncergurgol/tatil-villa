import { prisma } from "../lib/db";
import { resolveBiletallIframeSrc } from "../lib/biletall";
import { resolveBiletallPublicOrigin } from "../lib/biletall-callbacks";
import { parseBiletallRoutesJson } from "../lib/biletall-routes";

async function main() {
  const settings = await prisma.companySettings.findFirst({
    select: {
      biletallEnabled: true,
      biletallPortalSlug: true,
      biletallUsername: true,
      biletallPassword: true,
      biletallRoutesJson: true,
      domain: true,
    },
  });

  if (!settings) {
    console.log("No company settings");
    return;
  }

  const routes = parseBiletallRoutesJson(settings.biletallRoutesJson);
  const publicOrigin = resolveBiletallPublicOrigin(settings.domain);
  const credentials = {
    username: settings.biletallUsername,
    password: settings.biletallPassword,
  };

  console.log(
    JSON.stringify(
      {
        enabled: settings.biletallEnabled,
        portalSlug: settings.biletallPortalSlug,
        hasUsername: Boolean(settings.biletallUsername),
        hasPassword: Boolean(settings.biletallPassword),
        routes: routes.map((route) => ({
          kind: route.kind,
          publicPath: route.publicPath,
          callbackPath: route.callbackPath,
          customIframeSrc: route.customIframeSrc?.slice(0, 120),
        })),
        resolvedAra: resolveBiletallIframeSrc(
          "ara",
          settings.biletallPortalSlug,
          credentials,
          routes,
          publicOrigin
        ).replace(/Sifre=[^&]+/, "Sifre=***"),
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
