export function getSchoolAdminAccess(membership) {
  const roleSlug = membership?.role?.slug;
  const isAdmin = roleSlug === "admin";
  const isPrincipalAdmin = isAdmin && membership?.is_owner === true;
  const assignedSectionIds = (membership?.sections ?? []).map(
    (section) => section.id,
  );
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