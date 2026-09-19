function normalizeSectionIds(sections = []) {
  if (!Array.isArray(sections)) {
    return [];
  }

  return sections
    .map((section) => {
      if (!section) return null;
      if (typeof section === "string") return section;
      if (typeof section === "object") {
        return section.id ?? section.section_id ?? null;
      }
      return null;
    })
    .filter(Boolean);
}

export function getSchoolAdminAccess(membership) {
  const roleSlug = membership?.role?.slug ?? membership?.role_slug ?? null;
  const isAdmin = roleSlug === "admin";
  const isPrincipalAdmin = isAdmin && membership?.is_owner === true;
  const assignedSectionIds = normalizeSectionIds([
    ...(Array.isArray(membership?.sections) ? membership.sections : []),
    ...(Array.isArray(membership?.section_ids) ? membership.section_ids : []),
  ]);
  const isGeneralAdmin =
    isAdmin && !isPrincipalAdmin && assignedSectionIds.length === 0;
  const isSectionAdmin =
    isAdmin && !isPrincipalAdmin && assignedSectionIds.length > 0;

  return {
    roleSlug,
    isAdmin,
    isPrincipalAdmin,
    isGeneralAdmin,
    isSectionAdmin,
    hasGlobalAdminAccess: isPrincipalAdmin || isGeneralAdmin,
    assignedSectionIds,
  };
}