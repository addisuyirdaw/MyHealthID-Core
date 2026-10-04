const { searchPatientMasterRecord } = require('./lib/actions/patient.actions');
async function main() {
  const result = await searchPatientMasterRecord('PT-00004');
  console.log(JSON.stringify(result, null, 2));
}
main().catch(console.error);
