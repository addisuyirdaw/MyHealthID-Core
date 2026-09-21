/**
 * Shared utility functions for Registration V2.
 */

/**
 * Checks if a patient with the given national ID or phone number already exists.
 * Returns true if duplicate exists, false otherwise.
 */
export const checkDuplicate = async (nationalId?: string, phone?: string): Promise<boolean> => {
  const cleanNid = nationalId?.replace(/\s/g, '');
  const cleanPhone = phone?.replace(/\s/g, '');
  
  if (!cleanNid && !cleanPhone) {
    return false;
  }
  
  try {
    const res = await fetch(`/api/patients/check-exists?nid=${cleanNid || ''}&phone=${cleanPhone || ''}`);
    const data = await res.json();
    return data.exists === true;
  } catch (err) {
    console.error("Duplicate check failed:", err);
    return false;
  }
};
