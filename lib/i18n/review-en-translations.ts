export type ReviewEnTranslation = { title?: string; comment: string };

/** Onaylı yorumlar için EN metin (misafir / villa adları özel isim olarak korunur). */
export const reviewEnById: Record<string, ReviewEnTranslation> = {
  cmu0yg0drxif75v5fakiw12la: {
    title: "Villa Ihlamur",
    comment: "It was a wonderful holiday, thank you",
  },
  cmu0yfh4qxidf5v5fxgelvwm4: {
    title: "Villa DESSA",
    comment: "It was a wonderful holiday in every way. Thank you",
  },
  cmtpntdgilmyv5vweum7jh9ma: {
    title: "We enjoyed it as a family",
    comment:
      "We stayed as a family at this villa in Antalya Kalkan Sarıbelen. As a family of 5 we had a very comfortable and enjoyable time. Because the villa is new, everything was lovely—the pool was great and all the essentials were available. A table tennis table in the garden would have been even better. We went down to Antalya Kalkan and visited the public beach and Kaputaş Beach, which were also nice. It was a good enough holiday for us. The only difficulty was how far it is from Kocaeli. Sarıbelen is a bit far from Kalkan and not close to the centre, but you can go wherever you like by car. Thanks to Necla for helping with villa selection and pricing.",
  },
  cmt5iqx9gkpxn5vdn7qob4v7g: {
    comment:
      "We were very pleased and had a lovely time with my family. Many thanks to Nejla Güngör from Tatil Villacısı and to the homeowner Isa Bey—hope to see you again next year.",
  },
  cmt1avso9yzs25vbq8mp4tv9c: {
    title: "Many thanks to Barış Bey",
    comment:
      "A clean-air spot in the forest with a pool that cannot be seen from outside—quiet, peaceful and ideal for a private holiday close to nature. We loved it, though the roads are a bit narrow and steep, as expected on a hilltop. Special thanks to Barış Bey for letting us check in a day early when it was free and for meeting us at 2 a.m. There were a few minor shortcomings, but the holiday was nearly perfect. About 4 km from the beach and a lovely setting.",
  },
  cmsw80apb8acx5v4z7luscbs5: {
    title: "It was quite nice.",
    comment:
      "The bungalow was clean and well kept. Owner Isa Bey was very attentive and understanding. A peaceful place to stay. The pool was not too small—quite sufficient. The only downside was no air conditioning upstairs, so the children slept downstairs. Adding AC there would make it perfect.",
  },
  cmsk40fvyrf375visqhqthmvx: {
    comment: "Everything was lovely—thanks to Bayram Bey",
  },
  cmrckkdhe0036u608s9ljegm0: {
    title: "A lovely stay",
    comment:
      "The villa location was excellent. The kitchen was fully equipped and we spent a comfortable week with our family.",
  },
  cmrckkdh20035u608ya0cv9br: {
    title: "We will come again",
    comment:
      "The villa we rented in the Kalkan area was spotless and very comfortable. Check-in information arrived on time.",
  },
  cmrckkdg50034u608uyktfnjx: {
    title: "A wonderful family holiday",
    comment:
      "The villa was exactly as listed. The pool, garden and view were magnificent. The booking process was fast and transparent.",
  },
  cmrx9vh5m00rv5vizyiyqykr2: {
    comment:
      "We left very happy after our June stay. The location is close to everything—when you come to Fethiye you can choose it with confidence.",
  },
  cmrx9vh4o00r55vizk3fro4iw: {
    comment:
      "We stayed 3 nights / 4 days and felt at home—very comfortable, restful and enjoyable. Everything was spotless. The calm, peaceful setting helped us relax even more. Especially suitable for guests who want privacy. Owner Isa Bey and his wife took great care of us.",
  },
};

/** Homepage showcase / seed yorumlar için metin eşlemesi. */
export const reviewEnByCommentPrefix: Array<{
  match: string;
  title?: string;
  comment: string;
}> = [
  {
    match: "Villa Sefa çok sakin",
    comment:
      "Villa Sefa is a very calm and quiet place—we have been delighted since day one. A comfortable place for the whole family, with modest hosts and everything you need in a clean home. Thank you for everything.",
  },
  {
    match: "İlk günden itibaren Villa Sefada",
    comment:
      "From the first day at Villa Sefa we felt at home. A peaceful setting with quality furnishings down to the last detail. With my wife and daughter, our next choice will definitely be here again—we can recommend it to everyone, with or without children.",
  },
  {
    match: "Hiç tereddütsüz gelebilirsiniz",
    comment:
      "You can come without hesitation. We were unsure after reading reviews, but believe us—it is truly excellent. Everything in the photos and more is at the villa; we would consider coming again.",
  },
  {
    match: "Ağustos-22 son haftası",
    comment:
      "In the last week of August 2022 our holiday at Villa Sefa was even better than we hoped. We felt at home—clean and safe. The owners were warm and helpful. Prices were very reasonable. A quiet villa in nature to clear your head. Thank you so much.",
  },
  {
    match: "Tekrar geleceğiz",
    title: "We will come again",
    comment:
      "The villa we rented in the Kalkan area was spotless and very comfortable. Check-in information arrived on time.",
  },
  {
    match: "Harika bir aile tatili",
    title: "A wonderful family holiday",
    comment:
      "The villa was exactly as listed. The pool, garden and view were magnificent. The booking process was fast and transparent.",
  },
  {
    match: "Villa’dan çok menun kaldık",
    comment:
      "We were very pleased with the villa. It is well protected—some places claim privacy but still feel exposed. This one does not; it is very private and clean. We will definitely come back.",
  },
  {
    match: "Villa'dan çok menun kaldık",
    comment:
      "We were very pleased with the villa. It is well protected—some places claim privacy but still feel exposed. This one does not; it is very private and clean. We will definitely come back.",
  },
];

export function localizeReviewContent(
  input: {
    id?: string;
    title?: string | null;
    comment: string;
  },
  locale: string
): { title: string; comment: string } {
  const title = input.title?.trim() || "";
  const comment = input.comment || "";
  if (locale === "tr") return { title, comment };

  if (input.id && reviewEnById[input.id]) {
    const en = reviewEnById[input.id]!;
    return { title: en.title ?? title, comment: en.comment };
  }

  const matched = reviewEnByCommentPrefix.find((row) =>
    comment.trim().startsWith(row.match)
  );
  if (matched) {
    return {
      title: matched.title ?? title,
      comment: matched.comment,
    };
  }

  return { title, comment };
}
