import { getAllCitizens } from "@/lib/actions/system-admin.actions";
import CitizensClient from "./CitizensClient";

export default async function CitizensPage() {
  const citizens = await getAllCitizens();
  
  return <CitizensClient citizens={citizens} />;
}
