export const inssBanks = [
  { value: "121", label: "121 - AGIBANK" }, { value: "250", label: "250 - BANCO BCV" }, { value: "025", label: "025 - BANCO ALFA" },
  { value: "233", label: "233 - BANCO CIFRA" }, { value: "001", label: "001 - BANCO DO BRASIL" }, { value: "047", label: "047 - BANCO DO ESTADO DO SERGIPE" },
  { value: "079", label: "079 - BANCO ORIGINAL" }, { value: "643", label: "643 - BANCO PINE" }, { value: "081", label: "081 - BANCO SEGURO" },
  { value: "041", label: "041 - BANRISUL" }, { value: "268", label: "268 - BARIGUI" }, { value: "318", label: "318 - BMG" },
  { value: "237", label: "237 - BRADESCO S.A." }, { value: "070", label: "070 - BRB" }, { value: "626", label: "626 - C6 CONSIGNADO" },
  { value: "320", label: "320 - CCB BRASIL" }, { value: "104", label: "104 - CAIXA" }, { value: "069", label: "069 - CREFISA" },
  { value: "707", label: "707 - DAYCOVAL" }, { value: "335", label: "335 - DIGIO" }, { value: "149", label: "149 - FACTA" },
  { value: "012", label: "012 - INBURSA" }, { value: "029", label: "029 - ITAÚ CONSIGNADO" }, { value: "184", label: "184 - ITAÚ BBA" },
  { value: "341", label: "341 - ITAÚ UNIBANCO S.A." }, { value: "389", label: "389 - MERCANTIL" }, { value: "386", label: "386 - NU FINANCEIRA S.A." },
  { value: "753", label: "753 - NBC BANK" }, { value: "169", label: "169 - OLÉ CONSIGNADO" }, { value: "290", label: "290 - PAGBANK" },
  { value: "623", label: "623 - PAN" }, { value: "254", label: "254 - PARANÁ BANCO" }, { value: "752", label: "752 - BNP PARIBAS" },
  { value: "326", label: "326 - PARATI" }, { value: "611", label: "611 - PAULISTA" }, { value: "380", label: "380 - PICPAY" },
  { value: "329", label: "329 - QI SOCIEDADE" }, { value: "966", label: "966 - SABEMI" }, { value: "422", label: "422 - SAFRA" },
  { value: "033", label: "033 - SANTANDER" }, { value: "359", label: "359 - ZEMA" }, { value: "077", label: "077 - BANCO INTER" },
  { value: "756", label: "756 - SICOOB" }, { value: "999", label: "OUTROS" }
].sort((a, b) => {
  if (a.value === "999") return 1;
  if (b.value === "999") return -1;
  const nameA = a.label.substring(a.label.indexOf('-') + 1).trim();
  const nameB = b.label.substring(b.label.indexOf('-') + 1).trim();
  return nameA.localeCompare(nameB);
});
