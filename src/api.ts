export const getAuthProfile = async () => {
  // Retorna os dados do perfil do usuário autenticado no Firebase
  const { getAuth } = await import('firebase/auth');
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');
  return {
    email: user.email,
    displayName: user.displayName,
    uid: user.uid,
  };
};

export const updateAuthProfile = async (data: { displayName?: string; password?: string }) => {
  const { getAuth, updateProfile, updatePassword } = await import('firebase/auth');
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  if (data.displayName !== undefined) {
    await updateProfile(user, { displayName: data.displayName });
  }
  if (data.password) {
    await updatePassword(user, data.password);
  }
};
