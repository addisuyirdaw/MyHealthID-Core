import { directCitizenSignIn } from './lib/actions/patient.actions';

async function main() {
  const result = await directCitizenSignIn("HLT-380984", "123456");
  console.log("directCitizenSignIn result:", result);
}

main().catch(console.error);
