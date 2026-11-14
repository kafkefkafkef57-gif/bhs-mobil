# BHS MOBİL — Google Play yayın rehberi

Bu rehber uygulamayı Google Play'e yüklemek için gereken dosyaları ve adımları sırayla anlatır.

## Hazır dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `BHS-Mobil-1.0.0.aab` | Play Console'a yüklenecek imzalı uygulama paketi (size ayrıca gönderildi; depoda yoktur) |
| `upload-keystore.jks` + `anahtar-bilgileri.txt` | Yükleme imza anahtarı ve şifresi (size ayrıca gönderildi; **depoda yoktur, güvenle saklayın**) |
| `docs/google-play/simge-512.png` | Mağaza simgesi (512 × 512) |
| `docs/google-play/one-cikan-gorsel-1024x500.png` | Öne çıkan görsel (1024 × 500) |
| `docs/google-play/ekran-1 … ekran-6.png` | Telefon ekran görüntüleri (1080 × 1920, örnek verilerle) |
| `docs/GIZLILIK.md` | Gizlilik politikası |
| `docs/hesap-silme.md` | Hesap silme sayfası (Play bunu ayrı bir adres olarak ister) |

Uygulama bilgileri: paket adı `com.bhsmobil.app` (ilk yüklemeden sonra değiştirilemez), sürüm adı `1.0.0`, sürüm kodu `1`, hedef Android API 36.

## 1. Play Console'da uygulamayı oluşturma

1. play.google.com/console adresine girin (geliştirici hesabı tek seferlik 25 ABD doları).
2. **Uygulama oluştur**: ad `BHS MOBİL`, varsayılan dil Türkçe, tür **Uygulama**, **Ücretsiz**; beyanları onaylayın.

## 2. İlk yükleme: dahili test (önerilen)

Dahili test incelemesiz ve hızlıdır; en fazla 100 kişiye dağıtılır.

1. Sol menü: **Test > Dahili test > Yeni sürüm oluştur**.
2. Uygulama imzalama sorulursa **Google Play uygulama imzalamayı** kabul edin. Google asıl imza anahtarını kendisi saklar; sizdeki `upload-keystore.jks` yalnızca yükleme anahtarıdır.
3. `BHS-Mobil-1.0.0.aab` dosyasını yükleyin, sürüm notu yazın, **Kaydet > İncele > Yayınla**.
4. **Test kullanıcıları** sekmesinde bir e-posta listesi oluşturup test edecek kişilerin Google hesaplarını ekleyin; çıkan katılım bağlantısını onlara gönderin.

## 3. Mağaza girişi (Büyüme > Mağaza varlığı > Ana mağaza girişi)

- **Uygulama adı (en fazla 30 karakter):** BHS MOBİL
- **Kısa açıklama (en fazla 80 karakter):** Bagaj sistemi ekipleri için arıza, bakım, vardiya ve envanter takibi.
- **Tam açıklama:**

> BHS MOBİL, havalimanı bagaj sistemi (BHS) operasyon ve teknik ekiplerinin günlük işlerini tek yerden yürütmesini sağlar.
>
> OPERASYON
> • Arıza bildirimi: hat şeması üzerinden bölge seçerek arıza kaydı, haftalık bölge yoğunluğu ve arşiv
> • Ortak bildiri panosu ve vardiya paylaşımları
> • Personel lokasyon takibi ve aylık çalışma planı
> • Olay tutanakları ve operasyon görev takibi
> • Vardiya raporu ve aylık toplu rapor (PDF)
>
> TEKNİK
> • Ekipman bazında bakım ve onarım geçmişi
> • Günlük köprü ve arıza bakım kayıtları
> • Depo envanteri, kritik stok uyarısı ve bakımda kullanılan parçanın stoktan otomatik düşmesi
>
> Uygulama yalnızca yetkili personel içindir. Kayıt olan kullanıcılar, yönetici onayından sonra giriş yapabilir.

- **Uygulama simgesi:** `simge-512.png`
- **Öne çıkan görsel:** `one-cikan-gorsel-1024x500.png`
- **Telefon ekran görüntüleri:** `ekran-1` … `ekran-6` (en az 2 gerekli)
- **Kategori:** İş · **E-posta:** iletişim adresiniz

## 4. Uygulama içeriği beyanları (Politika > Uygulama içeriği)

| Bölüm | Cevap |
|---|---|
| Gizlilik politikası | `https://github.com/kafkefkafkef57-gif/bhs-mobil/blob/main/docs/GIZLILIK.md` |
| Uygulama erişimi | "Uygulamanın tamamı ya da bir kısmı kısıtlı" seçin; önceden onaylanmış bir test hesabının e-posta ve şifresini girin. Not: "Yeni kayıtlar yönetici onayı gerektirir; lütfen verilen onaylı hesabı kullanın." |
| Reklamlar | Hayır, reklam içermiyor |
| İçerik derecelendirmesi | Anketi doldurun: kategori "Yardımcı program / üretkenlik", şiddet, cinsellik vb. tüm sorulara Hayır. Sonuç: herkes için uygun |
| Hedef kitle | 18 yaş ve üzeri |
| Haber uygulaması | Hayır |
| Veri güvenliği | Aşağıdaki tabloya göre |

### Veri güvenliği formu

- Veri topluyor ya da paylaşıyor mu? **Evet**
- Veriler aktarım sırasında şifreleniyor mu? **Evet** (HTTPS)
- Kullanıcılar verilerinin silinmesini isteyebilir mi? **Evet**
- Hesap oluşturma yöntemi: kullanıcı adı (e-posta) ve şifre
- Hesap silme adresi: `https://github.com/kafkefkafkef57-gif/bhs-mobil/blob/main/docs/hesap-silme.md`

| Veri türü | Toplanıyor | Paylaşılıyor | Amaç | Zorunlu mu |
|---|---|---|---|---|
| Kişisel bilgiler > Ad | Evet | Hayır | Uygulama işlevi, hesap yönetimi | Zorunlu |
| Kişisel bilgiler > E-posta adresi | Evet | Hayır | Uygulama işlevi, hesap yönetimi | Zorunlu |
| Kişisel bilgiler > Telefon numarası | Evet | Hayır | Uygulama işlevi, hesap yönetimi | Zorunlu |
| Fotoğraflar ve videolar > Fotoğraflar | Evet | Hayır | Uygulama işlevi | İsteğe bağlı |
| Uygulama etkinliği > Kullanıcının oluşturduğu diğer içerikler | Evet | Hayır | Uygulama işlevi | Zorunlu |

## 5. Herkese açık yayın (üretim)

- **Kişisel geliştirici hesapları için test şartı:** Google, 13 Kasım 2023'ten sonra açılan kişisel hesaplarda üretime geçmeden önce **kapalı test** ister: en az 12 test kullanıcısının en az 14 gün boyunca testte kalması gerekir. Play Console'daki **Kontrol paneli** sizin hesabınız için geçerli şartı ve kalan süreyi gösterir. Kurumsal (şirket) hesaplarında bu şart yoktur.
- Şart sağlandıktan sonra: **Üretim > Yeni sürüm oluştur**, test edilmiş sürümü üretime taşıyın, ülkeleri seçin ve incelemeye gönderin. İlk inceleme birkaç gün sürebilir.
- **Yalnızca çalışanlar kullanacaksa** üretime hiç geçmeden kapalı test kanalında kalmak da bir seçenektir: uygulama mağazada aranınca çıkmaz, yalnızca eklediğiniz kişiler kurar.
- **Ad ve logo:** Simgede "Sabiha Gökçen Airport" geçtiği için Google da marka kullanım izni isteyebilir. Herkese açık yayından önce şirketten yazılı izin alın.

## 6. Sonraki sürümler

Her yeni sürümde:
1. `app.json` içindeki `android.versionCode` bir artırılır (1 → 2 → 3 …); istenirse `version` (1.0.0 → 1.0.1) de değiştirilir.
2. AAB **aynı** `upload-keystore.jks` ile imzalanarak yeniden derlenir.
3. Play Console'da ilgili kanalda **Yeni sürüm oluştur** ile yüklenir.

Anahtar dosyası ya da şifresi kaybolursa Play Console'dan "yükleme anahtarını sıfırlama" talebi açılabilir; birkaç gün sürer.

## Yayından önce kontrol listesi

- [ ] Supabase'de güncel `supabase/schema.sql` çalıştırıldı.
- [ ] Supabase > Authentication > Email > "Confirm email" kapalı (ya da e-posta doğrulaması çalışıyor).
- [x] `docs/GIZLILIK.md` ve `docs/hesap-silme.md` içindeki iletişim e-postası yazıldı.
- [ ] İnceleme için onaylı bir test hesabı açıldı.
- [ ] `upload-keystore.jks` ve şifresi güvenli bir yerde yedeklendi.
- [ ] Uygulama dahili testte gerçek telefonda denendi.
