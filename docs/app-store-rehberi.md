# BHS MOBİL — App Store (iPhone) yayın rehberi

Bu rehber uygulamayı Apple'a yüklemek için gereken her şeyi sırayla anlatır. Komutlar ve akış Expo'nun resmi belgelerine göre yazılmıştır (docs.expo.dev/submit/ios, docs.expo.dev/build/setup; Kasım 2026).

## 0. Önce karar: herkese açık mağaza mı, TestFlight mı?

- **TestFlight (önerilen ilk adım):** Apple'ın test dağıtım servisi. Uygulama mağazada görünmez; davet ettiğiniz kişiler TestFlight uygulamasıyla kurar. Şirkete sunum ve ekip içi kullanım için yeterlidir. Kendi ekibiniz (App Store Connect'e eklediğiniz kişiler) için Apple incelemesi gerekmez.
- **Herkese açık App Store:** Apple incelemesinden geçer. Yalnızca tek bir şirketin çalışanlarına yönelik ve yönetici onayıyla girilen uygulamaları Apple çoğu zaman herkese açık mağaza yerine "Unlisted App" (yalnızca bağlantıyla erişilen) ya da kurumsal dağıtıma yönlendirir.
- **Ad ve logo:** Uygulamanın adında ve simgesinde "Sabiha Gökçen Airport" geçiyor. Apple, başka bir kurumun adını ve markasını kullanan uygulamalarda kullanım izni isteyebilir. Herkese açık yayından önce şirketten yazılı izin alınması gerekir.

Aşağıdaki 1–5. adımlar her iki yol için de aynıdır.

## 1. Hesaplar (bir kez)

| Ne | Nereden | Ücret |
|---|---|---|
| Apple Developer Program üyeliği | developer.apple.com/programs | Yıllık 99 ABD doları |
| Expo hesabı | expo.dev/signup | Ücretsiz plan yeterli |

Apple üyeliğinin onaylanması birkaç gün sürebilir. iPhone derlemesi için Mac gerekmez; derleme Expo'nun bulut servisinde yapılır.

## 2. Bilgisayar hazırlığı (bir kez)

Windows, Mac ya da Linux olabilir.

1. nodejs.org adresinden Node.js (LTS) kurun.
2. git-scm.com adresinden Git kurun.
3. Kodu indirin ve bağımlılıkları kurun:

```bash
git clone https://github.com/kafkefkafkef57-gif/bhs-mobil.git
```

```bash
cd bhs-mobil
```

```bash
npm install
```

## 3. Projeyi Expo hesabına bağlama (bir kez)

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest init
```

`init` komutu projeyi Expo hesabınızda oluşturur ve `app.json` dosyasına bir proje kimliği yazar. Bu değişikliği saklayın (GitHub'a gönderin ya da bana haber verin).

## 4. iPhone derlemesi

```bash
npx eas-cli@latest build --platform ios --profile production
```

- İlk çalıştırmada Apple hesabınızla giriş yapmanız istenir; imzalama sertifikasını ve profilini EAS'ın oluşturmasına izin verin ("evet" deyin).
- Derleme Expo sunucularında yapılır, yaklaşık 15–30 dakika sürer. Bitince bir `.ipa` dosyası oluşur.
- Paket kimliği: `com.bhsmobil.app`. Derleme numarası her derlemede otomatik artar.

## 5. Apple'a yükleme

```bash
npx eas-cli@latest submit --platform ios
```

Komut derlemeyi seçtirir, Apple kimliğinizi sorar ve dosyayı App Store Connect'e yükler. Uygulama kaydı yoksa kendisi oluşturur. Yüklenen derleme 10–15 dakika içinde TestFlight'ta görünür.

## 6a. TestFlight ile dağıtım

1. appstoreconnect.apple.com > Uygulamalar > BHS MOBİL > TestFlight.
2. **Dahili test:** "Internal Testing" grubu açın, test edecek kişileri ekleyin (önce Users and Access bölümünden ekibinize eklenmeleri gerekir; en fazla 100 kişi). İnceleme beklemez.
3. **Harici test:** Ekibiniz dışındaki kişiler için "External Testing" grubu açın (en fazla 10.000 kişi). İlk derleme Apple'ın kısa beta incelemesinden geçer.
4. Test edenler iPhone'larına App Store'dan "TestFlight" uygulamasını kurar ve daveti kabul eder.

## 6b. Herkese açık App Store'a gönderme

App Store Connect > BHS MOBİL > App Store sekmesinde aşağıdakileri doldurun, derlemeyi seçin ve "Add for Review" ile gönderin. İnceleme genellikle 1–3 gün sürer.

### Mağaza bilgileri (hazır metinler)

- **Ad:** BHS MOBİL
- **Alt başlık (en fazla 30 karakter):** Bagaj sistemi ekip takibi
- **Kategori:** İş (Business)
- **Yaş sınırı:** 4+
- **Anahtar kelimeler (en fazla 100 karakter):** bagaj,BHS,havalimanı,vardiya,arıza,bakım,operasyon,teknik,envanter,tutanak
- **Gizlilik politikası adresi:** https://github.com/kafkefkafkef57-gif/bhs-mobil/blob/main/docs/GIZLILIK.md
- **Destek adresi:** https://github.com/kafkefkafkef57-gif/bhs-mobil
- **Tanıtım metni (en fazla 170 karakter):** Bagaj sistemi operasyon ve teknik ekipleri için arıza, bakım, vardiya ve envanter takibi tek uygulamada.

**Açıklama:**

> BHS MOBİL, havalimanı bagaj sistemi (BHS) operasyon ve teknik ekiplerinin günlük işlerini tek yerden yürütmesini sağlar.
>
> Operasyon
> • Arıza bildirimi: hat şeması üzerinden bölge seçerek arıza kaydı, haftalık bölge yoğunluğu ve arşiv
> • Ortak bildiri panosu ve vardiya paylaşımları
> • Personel lokasyon takibi ve aylık çalışma planı
> • Olay tutanakları ve operasyon görev takibi
> • Vardiya raporu ve aylık toplu rapor (PDF)
>
> Teknik
> • Ekipman bazında bakım ve onarım geçmişi
> • Günlük köprü ve arıza bakım kayıtları
> • Depo envanteri, kritik stok uyarısı ve bakımda kullanılan parçanın stoktan otomatik düşmesi
>
> Uygulama yalnızca yetkili personel içindir. Kayıt olan kullanıcılar, yönetici onayından sonra giriş yapabilir.

### Ekran görüntüleri

`docs/app-store-ekran/` klasöründe 6 adet hazır görüntü var (1290 × 2796 piksel, iPhone 6,9 inç için). App Store Connect'te "iPhone 6.9" Display" bölümüne yükleyin. Görüntüler örnek verilerle alınmıştır; uygulama yalnızca iPhone için ayarlandığından iPad görüntüsü gerekmez.

### Uygulama Gizliliği (App Privacy) soruları

"Data Collection" bölümünde **Yes, we collect data** seçin ve şunları işaretleyin:

| Veri türü | Amaç | Kullanıcıya bağlı mı | Takip için mi |
|---|---|---|---|
| Contact Info > Name | App Functionality | Evet | Hayır |
| Contact Info > Email Address | App Functionality | Evet | Hayır |
| Contact Info > Phone Number | App Functionality | Evet | Hayır |
| User Content > Photos or Videos | App Functionality | Evet | Hayır |
| User Content > Other User Content | App Functionality | Evet | Hayır |

### İnceleme ekibi için notlar (App Review Information)

Apple'ın inceleme ekibi uygulamaya girebilmelidir. Göndermeden önce uygulamada bir test hesabı oluşturup yönetici panelinden onaylayın ve bilgilerini "Sign-In Information" alanına yazın. "Notes" alanına şunu yapıştırın:

> BHS MOBİL is an internal operations app for airport baggage handling system (BHS) staff. New registrations must be approved by an administrator before they can sign in, so please use the pre-approved demo account provided above.
> Account deletion is available in the app: tap the "..." menu at the top right > Kişisel Profil > Hesabı sil > Hesabımı Sil.
> The app uses the camera and photo library only when the user attaches a photo to a record. It does not use location, tracking or advertising.

- **Şifreleme sorusu (Export Compliance):** Uygulama yalnızca standart HTTPS kullanır; bu, yapılandırmada "muaf" olarak işaretlendi, soru çıkmaz.
- **Hesap silme:** Apple, hesap açılabilen uygulamalarda uygulama içinden hesap silmeyi zorunlu tutar. Bu özellik eklendi (Kişisel Profil > Hesabı sil).

## 7. Yayından önce kontrol listesi

- [ ] Supabase'de güncel `supabase/schema.sql` çalıştırıldı.
- [ ] Supabase > Authentication > Email > "Confirm email" kapalı (ya da e-posta doğrulaması çalışıyor).
- [x] `docs/GIZLILIK.md` içindeki iletişim e-postası yazıldı.
- [ ] İnceleme için onaylı bir test hesabı açıldı.
- [ ] Uygulama TestFlight ile gerçek bir iPhone'da denendi (giriş, fotoğraf ekleme, klavye, PDF paylaşma).
- [ ] Şirket adı ve logosunun kullanımı için izin alındı (herkese açık yayın için).

## Sonraki sürümler

Kod değiştikçe aynı iki komut yeterlidir:

```bash
npx eas-cli@latest build --platform ios --profile production
```

```bash
npx eas-cli@latest submit --platform ios
```

Kullanıcıya görünen sürüm numarasını (`1.0.0`) değiştirmek için `app.json` içindeki `version` alanı güncellenir.
