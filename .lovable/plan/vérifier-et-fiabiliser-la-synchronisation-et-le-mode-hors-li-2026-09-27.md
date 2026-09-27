# Vérifier et fiabiliser la synchronisation et le mode hors ligne

## Constat (lecture du code)
- **Saisie hors ligne : fonctionne.** Lots, événements, relevés et opérations sont gardés sur le téléphone puis envoyés au retour du réseau (au retour de connexion et toutes les 60 s). Les données déjà vues restent affichées hors ligne.
- **L'appli ne s'ouvre pas sans internet.** Aucun mécanisme ne garde les pages elles-mêmes sur le téléphone : si l'éleveur ferme l'appli ou recharge la page sans réseau, il obtient une page d'erreur du navigateur.
- **Risque de doublons.** Si le réseau coupe juste après un envoi réussi, la même opération peut être renvoyée et enregistrée deux fois.
- **Blocage possible.** Une saisie refusée définitivement par le serveur reste en attente et est renvoyée indéfiniment, sans que l'éleveur le sache.
- **Suppressions hors ligne :** elles échouent simplement (message d'erreur), sans être mises en attente.

## Ce qui sera corrigé
1. **Ouverture sans internet** : l'appli publiée (écran d'accueil ou navigateur) s'ouvre et affiche les dernières données même sans réseau. Ne fonctionne pas dans l'aperçu de l'éditeur, seulement sur le site publié.
2. **Zéro doublon** : chaque saisie reçoit un identifiant unique dès sa création ; un renvoi ne crée jamais de deuxième ligne.
3. **Saisies bloquées signalées** : après plusieurs échecs, la saisie est marquée « non envoyée » dans le badge de synchronisation, avec possibilité de réessayer ou d'abandonner.
4. **Suppressions hors ligne** mises en attente et appliquées au retour du réseau (après la confirmation habituelle).
5. Tous les nouveaux textes en FR/EN/AR.

## Vérification
Test automatisé dans l'aperçu : couper le réseau, ajouter une opération, un relevé et un événement, supprimer une ligne, rétablir le réseau, puis contrôler dans la base qu'il y a exactement une ligne par saisie et que la suppression est faite. Les données de test seront ensuite supprimées. Test d'ouverture hors ligne sur une version publiée localement.

## Détails techniques
- `vite-plugin-pwa` (`generateSW`, `/sw.js`, `registerType: autoUpdate`, `injectRegister: null`, `devOptions.enabled: false`), navigation `NetworkFirst`, assets hachés `CacheFirst`, exclusion `/~oauth` ; module d'enregistrement unique refusant dev/iframe/hôtes de preview et `?sw=off` (désinscription dans ces cas).
- Outbox : `id` UUID généré à l'enqueue, envoi via `upsert(..., { onConflict: "id", ignoreDuplicates: true })` ; compteur `attempts` ; erreurs non réseau (4xx/validation) → état `failed` après 3 tentatives ; nouveau type d'item `delete`.
- Upload de note vocale : chemin déterministe basé sur l'id pour éviter les fichiers en double lors d'un renvoi.
- `useDeleteRow` : hors ligne → enqueue delete + retrait optimiste du cache.
- Badge dans `AppShell` : compte des éléments en attente / en échec, menu Réessayer / Abandonner.
