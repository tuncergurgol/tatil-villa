<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Müşteri bağlantı kuralı

- SMS, WhatsApp ve e-posta mesajlarında `bont.*`, `/admin` veya localhost bağlantısı asla yer almamalıdır.
- Müşteriye giden tüm villa/listelik bağlantıları seçilen public site domaininden üretilmelidir.
- Domain belirsizse varsayılan `www.tatildeyiz.com.tr` kullanılır.
- Toplu villa teklif bağlantıları her zaman Tatildeyiz public frontend üzerinden ve kısa `/teklif/{code}` yapısıyla gönderilir.
