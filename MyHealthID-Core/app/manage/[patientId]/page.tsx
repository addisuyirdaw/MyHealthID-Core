import { notFound } from "next/navigation";
import { getPatientManageBundle } from "@/lib/actions/emr.actions";
import ManageWorkspaceClient from "@/components/manage/ManageWorkspaceClient";

export const dynamic = "force-dynamic";

export default async function EmrManagePage({ params }: { params: { patientId: string } }) {
  const bundle = await getPatientManageBundle(params.patientId);
  if (!bundle) notFound();

  return <ManageWorkspaceClient bundle={bundle} />;
}
