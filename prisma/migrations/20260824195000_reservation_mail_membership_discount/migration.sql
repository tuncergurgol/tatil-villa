-- Rezervasyon talebi mail şablonuna üyelik statüsü ve indirim tutarı satırları
UPDATE "AgencyMessageTemplate"
SET
  "mailBody" = REPLACE(
    REPLACE(
      "mailBody",
      E'Telefon:\t##MUSTERITELEFON##\n\nMisafir Bilgileri',
      E'Telefon:\t##MUSTERITELEFON##\nÜyelik Statüsü:\t##UYELIKSTATU##\n\nMisafir Bilgileri'
    ),
    E'Konaklama Bedeli :\t##GROSSPRICE## TL\n',
    E'Konaklama Bedeli :\t##GROSSPRICE## TL\nAcente / Üyelik İndirimi :\t-##INDIRIMTUTARI## TL\n'
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "rowNo" = 11
  AND "mailBody" NOT LIKE '%##UYELIKSTATU##%';
