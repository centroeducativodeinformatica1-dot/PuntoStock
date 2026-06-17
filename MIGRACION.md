# PuntoStock — Migración a Supabase

## Archivos migrados

| Archivo original | Archivo nuevo | Cambios |
|---|---|---|
| `js/firebase-config.js` | `js/supabase-config.js` | SDK + helper `getBusinessId()` |
| `js/app.js` | `js/app.js` | `auth.onAuthStateChanged` → `sb.auth.onAuthStateChange`, `db.collection` → `sb.from` |
| `js/auth.js` | `js/auth.js` | `createUserWithEmailAndPassword` → `sb.auth.signUp`, batch → inserts sequenciales |
| `js/dashboard.js` | `js/dashboard.js` | Queries Firestore → `sb.from().select()` con filtros Supabase |
| `js/stock.js` | `js/stock.js` | CRUD completo, import/export XLSX migrados |
| `js/ventas.js` | `js/ventas.js` | `db.batch()` → inserts + RPC `decrementar_stock` |
| `js/modules.js` | `js/modules.js` | Historial, Clientes, Proveedores, Caja, Empleadas |
| `app/index.html` | `app/index.html` | CDN Firebase → CDN Supabase |
| *(nuevo)* | `supabase-schema.sql` | Schema completo con RLS |

---

## Pasos para hacer funcionar

### 1. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → New Project
2. Elegir región (recomendado: `South America (São Paulo)`)
3. Anotar:
   - **Project URL**: `https://XXXXXX.supabase.co`
   - **anon/public key**: desde Settings → API

### 2. Ejecutar el schema SQL

1. Dashboard → **SQL Editor** → New query
2. Pegar el contenido completo de `supabase-schema.sql`
3. Ejecutar (▶)

Esto crea todas las tablas, RLS policies, la función `decrementar_stock`, y el trigger de auto-perfil.

### 3. Configurar credenciales

Editar `js/supabase-config.js`:
```js
const SUPABASE_URL  = 'https://TU_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'TU_ANON_KEY';
```

### 4. Configurar Auth en Supabase

Dashboard → **Authentication** → Settings:
- Desactivar "Enable email confirmations" (para que el login funcione sin confirmar email, como en Firebase)
- O configurar el redirect URL si querés confirmación

### 5. Migrar datos existentes de Firebase (opcional)

Si tenés datos en Firebase que querés migrar:

```js
// Script de migración — ejecutar en consola del navegador
// con Firebase inicializado en la pestaña anterior

const SUPABASE_URL  = 'https://TU_PROJECT.supabase.co';
const SUPABASE_ANON = 'TU_ANON_KEY';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// 1. Exportar businesses de Firebase
const bizSnap = await firebase.firestore().collection('businesses').get();
for (const doc of bizSnap.docs) {
  const d = doc.data();
  await sb.from('businesses').insert({
    id: doc.id,  // mantener el mismo ID si querés
    name: d.name,
    owner_name: d.ownerName,
    owner_uid: d.ownerUid,
    email: d.email,
    phone: d.phone,
    tipo_negocio: d.tipoNegocio,
    active: d.active,
    plan: d.plan,
    plan_solicitado: d.planSolicitado,
    cantidad_negocios: d.cantidadNegocios,
    trial_ends: d.trialEnds?.toDate?.()?.toISOString()
  });
}
```

---

## Diferencias clave entre Firebase y Supabase

| Concepto | Firebase | Supabase |
|---|---|---|
| Auth | `auth.signInWithEmailAndPassword()` | `sb.auth.signInWithPassword()` |
| Sesión | `auth.onAuthStateChanged()` | `sb.auth.onAuthStateChange()` |
| Leer colección | `db.collection().where().get()` | `sb.from().select().eq()` |
| Insertar | `collection.add(data)` | `sb.from().insert(data)` |
| Actualizar | `doc.update(data)` | `sb.from().update(data).eq('id', id)` |
| Eliminar | `doc.delete()` | `sb.from().delete().eq('id', id)` |
| Timestamp | `FieldValue.serverTimestamp()` | `new Date().toISOString()` o `default now()` en SQL |
| Batch | `db.batch()` | inserts paralelos con `Promise.all()` |
| Decrement | `FieldValue.increment(-n)` | RPC `decrementar_stock(id, n)` |
| Subcol. empleadas | `businesses/{biz}/empleadas/{id}/consumos` | tabla `empleada_consumos` con `business_id + empleada_id` |
| Seguridad | Firestore Rules | RLS Policies en PostgreSQL |

---

## Notas de arquitectura

### Multi-tenant
Igual que antes: cada tabla tiene `business_id`. Las RLS policies usan `get_my_business_ids()` que lee el array `business_ids` del perfil del usuario, permitiendo multi-negocio.

### Stock atómico
La función `decrementar_stock(p_id, p_cantidad)` corre en el servidor con `SECURITY DEFINER`, garantizando que no haya race conditions en ventas concurrentes.

### Perfil de usuario
Supabase Auth maneja `auth.users`. La tabla `profiles` extiende esa info con `business_id`, `role`, etc. El trigger `on_auth_user_created` crea automáticamente un perfil vacío en cada registro.

### Nombres de columnas
Firebase usaba camelCase (`ownerName`, `tipoNegocio`). Las tablas de Supabase usan snake_case (`owner_name`, `tipo_negocio`), que es la convención de PostgreSQL.
