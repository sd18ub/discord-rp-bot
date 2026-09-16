# Discord RP Bot

Bot Discord (Node.js / discord.js) permettant aux membres de creer et consulter des fiches de personnage RP, via un formulaire en plusieurs etapes (modals Discord). Le format des champs s'inspire d'une fiche type "personnage a pouvoirs" (nom/alias, rang, apparence, personnalite, pouvoirs, faiblesses, historique, relations, objectifs) mais reste generique pour n'importe quel univers RP.

## Commandes disponibles

- `/fiche create` - ouvre le formulaire de creation (4 etapes)
- `/fiche annuler` - annule une creation en cours
- `/fiche voir [membre]` - affiche ta fiche ou celle d'un autre membre
- `/fiche liste` - liste toutes les fiches du serveur
- `/fiche supprimer [membre]` - supprime ta fiche (ou celle d'un autre membre si tu as la permission "Gerer les roles")

## Comment fonctionne la creation de fiche

`/fiche create` ouvre un premier formulaire (informations de base). A la validation, le bot affiche un message ephemere (visible seulement par toi) avec un bouton **Continuer** qui ouvre l'etape suivante. Il y a 4 etapes :

1. Informations de base (nom, alias, age, genre, statut)
2. Apparence & personnalite (+ traits positifs/negatifs)
3. Pouvoirs & faiblesses (+ equipement)
4. Historique, objectifs, relations

A la derniere etape, la fiche complete est publiee (visible par tout le monde) dans le salon ou `/fiche create` a ete lance, et sauvegardee.

**Important** : si tu ne termines pas les 4 etapes (le bot redemarre entre-temps, ou tu abandonnes), le brouillon est perdu. Utilise `/fiche annuler` pour repartir de zero si besoin.

## Stockage des donnees

Les fiches terminees sont sauvegardees dans des fichiers JSON locaux, un par serveur : `data/<id-du-serveur>.json`. Ce dossier est ignore par git (jamais commite), donc les fiches restent uniquement sur la machine ou tourne le bot.

## 1. Creer l'application et le bot sur Discord

Ce bot doit avoir sa **propre application Discord**, distincte de tout autre bot que tu geres deja.

1. Va sur https://discord.com/developers/applications
2. **New Application** -> donne-lui un nom (ex: "Fiches RP")
3. Onglet **Bot** :
   - Clique **Add Bot** si necessaire
   - Clique **Reset Token** puis copie le token (garde-le secret)
4. Onglet **General Information** -> copie l'**Application ID** (= CLIENT_ID)
5. Recupere l'**ID de ton serveur** (GUILD_ID) : mode developpeur active dans Discord (Parametres > Avance), puis clic droit sur le serveur > Copier l'ID

Aucun intent privilegie n'est necessaire pour ce bot (pas besoin de "Server Members Intent").

## 2. Configurer le projet

```bash
npm install
```

Copie `.env.example` en `.env` et remplis :

```
DISCORD_TOKEN=le_token_copie_a_l_etape_precedente
CLIENT_ID=l_application_id
GUILD_ID=l_id_de_ton_serveur
```

## 3. Inviter le bot sur ton serveur

Onglet **OAuth2 > URL Generator** :
- Scopes : `bot`, `applications.commands`
- Permissions du bot : **Send Messages**, **Embed Links** suffisent (pas besoin de droits d'administration pour ce bot)

Ouvre l'URL generee, choisis ton serveur, autorise.

## 4. Deployer les commandes slash

```bash
npm run deploy
```

## 5. Lancer le bot

```bash
npm start
```

Le bot doit rester lance pour repondre aux commandes.
