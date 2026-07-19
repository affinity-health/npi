import { NppesClient } from "../src/index.ts";

const npi = process.argv[2] ?? "1003000126";
const record = await new NppesClient().lookup(npi);

if (!record) {
  console.error(`No NPPES record found for ${npi}`);
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        enumerationType: record.enumeration_type,
        name:
          record.basic.organization_name ??
          [record.basic.first_name, record.basic.middle_name, record.basic.last_name]
            .filter(Boolean)
            .join(" "),
        npi: record.number,
        status: record.basic.status,
      },
      null,
      2,
    ),
  );
}
