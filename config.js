// Configuración de Supabase: Project Settings > API.
//
// La clave "anon" (o "publishable") es pública por diseño: va en el navegador.
// La seguridad la dan las políticas RLS de supabase/schema.sql.
// NUNCA pongas aquí la clave "service_role".
//
// Mientras url y anonKey estén vacíos, el chat funciona en modo demostración
// (los mensajes se guardan solo en el navegador de quien los escribe).
window.SUPABASE_CONFIG = {
  url: "https://nxykmhdtwismygyaljyz.supabase.co",
  anonKey: "sb_publishable_9xNx5TU7-eMw7ZVB2XV-YA_H8sVggBR"
 vapidPublicKey: 'BFfXL_Vr2MYfNUI32S06b9FKv1s1OcXgxon35pjqS1lQqPxzjyT6BE65cmGTjXFHYZp2Y7ojIulvHF0XjMnAuNg'
};
