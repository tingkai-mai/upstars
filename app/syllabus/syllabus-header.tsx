import { PageHeader } from "@/components/page-header";
import { Tabs } from "@/components/tabs";
import type { TestType } from "@/lib/tests";
import type { Selection } from "./selection";
import { SyllabusFilter } from "./syllabus-filter";
import { ManageSubjects } from "./manage-subjects";

type Props = {
    tab: "syllabus" | "worksheets" | "tests";
    selection: Selection;
    /** Admins get the Subjects button for adding and editing levels and subjects */
    canEdit: boolean;
    /** Tests tab: the selected test type, shown as a third filter */
    testType?: TestType;
};

export function SyllabusHeader({ tab, selection, canEdit, testType }: Props) {
    const query = selection.subject ? `?subject=${selection.subject.id}` : "";

    return (
        <>
            <PageHeader title="Syllabus management" back={{ href: "/", label: "Home" }} action={canEdit && <ManageSubjects subjects={selection.subjects} />} />
            <Tabs
                label="Syllabus management"
                tabs={[
                    { label: "Syllabus", href: `/syllabus${query}`, active: tab === "syllabus" },
                    { label: "Worksheets", href: `/syllabus/worksheets${query}`, active: tab === "worksheets" },
                    { label: "Tests", href: `/syllabus/tests${query}`, active: tab === "tests" },
                ]}
            />
            {selection.subject && <SyllabusFilter subjects={selection.subjects} levels={selection.levels} level={selection.level} subjectId={selection.subject.id} testType={testType} />}
        </>
    );
}
