# Discord RP Bot

Bot Discord (Node.js / discord.js) permettant aux membres de creer et consulter des fiches de personnage RP, via un formulaire en plusieurs etapes (modals Discord). Le format des champs s'inspire d'une fiche type "personnage a pouvoirs" (nom/alias, rang, apparence, personnalite, pouvoirs, faiblesses, historique, relations, objectifs) mais reste generique pour n'importe quel univers RP.

## Commandes disponibles

- `/fiche create` - ouvre le formulaire de creation (4 etapes)
- `/fiche annuler` - annule une creation en cours
- `/fiche modifier section:<base|apparence|pouvoirs|historique>` - rouvre uniquement la section choisie, sans tout retaper
- `/fiche voir [membre]` - affiche ta fiche ou celle d'un autre membre
- `/fiche liste [recherche] [rang]` - liste les fiches du serveur, avec filtre optionnel par mot-cle ou par rang/statut
- `/fiche supprimer [membre]` - supprime ta fiche (ou celle d'un autre membre si tu es staff RP, voir plus bas)
- `/fiche valider membre statut:<validee|refusee> [commentaire]` - reserve au staff RP, valide ou refuse une fiche
- `/fiche export [membre]` - exporte une fiche en fichier `.txt` telechargeable
- `/fiche relation ajouter membre type [confiance] [affection]` - ajoute/met a jour une relation structuree sur ta fiche
- `/fiche relation retirer membre` - retire une relation
- `/fiche relation liste [membre]` - affiche les relations d'une fiche
- `/fiche config role-staff role [salon]` - (admin serveur) definit le role charge de valider les fiches, et prepare le salon de validation

## Comment fonctionne la creation de fiche

`/fiche create` ouvre un premier formulaire (informations de base). A la validation, le bot affiche un message ephemere (visible seulement par toi) avec un bouton **Continuer** qui ouvre l'etape suivante. Il y a 4 etapes :

1. Informations de base (nom, alias, age, genre, statut)
2. Apparence & personnalite (+ traits positifs/negatifs)
3. Pouvoirs & faiblesses (+ equipement)
4. Historique, objectifs, relations (notes libres), lien image

A la derniere etape, la fiche complete est publiee (visible par tout le monde) dans le salon ou `/fiche create` a ete lance, et sauvegardee. Le brouillon en cours est desormais sauvegarde sur disque a chaque etape : si le bot redemarre avant que tu aies fini, tu peux reprendre en relancant simplement `/fiche create` et en cliquant sur le bouton "Continuer" a nouveau (le contenu deja saisi est preserve).

Pour ne corriger qu'une seule section d'une fiche deja terminee, utilise `/fiche modifier` plutot que de tout recreer.

## Validation par un staff RP (optionnel)

Par defaut, aucune validation n'est requise : une fiche terminee est immediatement marquee "validee" et publiee directement dans le salon ou la commande a ete lancee. Si tu definis un role staff avec `/fiche config role-staff @role` :

- Le bot **cree automatiquement un salon** `#validation-fiches` (visible uniquement par le role staff et le bot ; `@everyone` n'y a pas acces), et retient son identifiant. Si tu preferes utiliser un salon existant, passe-le en option : `/fiche config role-staff role:@Staff salon:#mon-salon`
- Toute nouvelle fiche creee, ou toute section modifiee via `/fiche modifier`, repasse au statut **"en attente de validation"** et est postee dans ce salon (l'auteur recoit juste une confirmation privee, la fiche n'est plus publiee immediatement dans le salon d'origine)
- Les membres ayant le role staff (ou la permission Administrateur) utilisent `/fiche valider` pour l'accepter ou la refuser, avec un commentaire optionnel
- Le statut est affiche dans l'embed de la fiche (couleur et badge dedies) et dans `/fiche liste`

**Permission requise** : pour que le bot puisse creer et configurer ce salon, il a besoin de la permission Discord **Gerer les salons** (a ajouter lors de l'invitation, voir etape 3, ou directement sur le role du bot dans les parametres du serveur). Sans cette permission, `/fiche config role-staff` te previendra et tu pourras soit la lui accorder, soit relancer la commande en pointant vers un salon existant via l'option `salon`.

Sans role staff configure, `/fiche supprimer` (sur la fiche d'un autre membre) et `/fiche valider` retombent sur la permission Discord "Gerer les roles".

## Relations structurees

En plus du champ texte libre "Relations" du formulaire, `/fiche relation ajouter` permet d'enregistrer des relations formelles (type + niveaux de confiance/affection sur 10) avec d'autres membres, affichees automatiquement dans l'embed de la fiche.

## Export

`/fiche export` genere un fichier `.txt` reprenant l'integralite d'une fiche (toutes les sections + relations), envoye en message prive (ephemere) a la personne qui utilise la commande.

## Stockage des donnees

Tout est sauvegarde en JSON local dans le dossier `data/` (ignore par git, jamais commite) :
- `data/<id-serveur>.json` - les fiches terminees
- `data/drafts/<id-serveur>_<id-utilisateur>.json` - les brouillons de creation/edition en cours
- `data/config/<id-serveur>.json` - la configuration du serveur (role staff, salon de validation)

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
- Permissions du bot : **Send Messages**, **Embed Links** (pas besoin de droits d'administration pour ce bot). Ajoute aussi **Manage Channels** si tu comptes utiliser la validation par un staff RP (voir plus bas) et laisser le bot creer son salon lui-meme.

Ouvre l'URL generee, choisis ton serveur, autorise.

Si le bot est deja invite sans **Manage Channels** et que tu actives la validation apres coup, tu peux soit l'ajouter directement au role du bot dans Parametres du serveur > Roles, soit fournir un salon existant via l'option `salon` de `/fiche config role-staff`.

## 4. Deployer les commandes slash

```bash
npm run deploy
```

## 5. Lancer le bot

```bash
npm start
```

Le bot doit rester lance pour repondre aux commandes.
