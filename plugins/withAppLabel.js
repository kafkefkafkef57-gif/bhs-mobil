// Android'de simgenin altında görünen adı belirler.
// app.json'daki "name" yalnızca ASCII harf içermeli (iOS proje adı ondan türetiliyor; "İ" gibi harfler
// EAS derlemesinde "Could not find target" hatasına yol açıyor). Görünen ad burada ayrıca verilir.
const { AndroidConfig, withStringsXml } = require('expo/config-plugins');

module.exports = function withAppLabel(config, { label }) {
  return withStringsXml(config, (c) => {
    c.modResults = AndroidConfig.Strings.setStringItem([{ $: { name: 'app_name' }, _: label }], c.modResults);
    return c;
  });
};
