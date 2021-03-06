Durafront
=========

Français: Ceci est une interface Web de [DuraLex](https://github.com/Legilibre/DuraLex) et [SedLex](https://github.com/Legilibre/SedLex). En un mot, ces trois programmes permettent de calculer le diff correspondant à un amendement rédigé dans le vocable français de l’Assemblée nationale et du Sénat.

English: This is a Web interface of [DuraLex](https://github.com/Legilibre/DuraLex) and [SedLex](https://github.com/Legilibre/SedLex). In a nutshell, these three programs permit to compute the diff corresponding to an amendment written in the French legal speaking used in the Assemblée nationale and Sénat.

Détails
-------

Cette interface permet d’accéder plus facilement aux résultats de DuraLex et SedLex -- sinon c’est la ligne de commande après avoir déployé [legi.py](https://github.com/Legilibre/legi.py) et [Archéo Lex](https://github.com/Legilibre/Archeo-Lex) -- et ainsi d’améliorer plus rapidement DuraLex pour la compréhension des structures de phrases actuellement mal reconnues.

Ce programme Durafront est actuellement **très expériemental** et changera, possiblement dans des proportions importantes.

Un déploiement **expérimental** est sur https://archeo-lex.fr/durafront/. Les « amendements » qu’il est possible d’entrer pour l’instant sont plutôt les articles des projets/propositions de loi qui modifient un code existant ou la Constitution.

L’interface et l’API vont évoluer dans les semaines qui suivent (fin décembre 2018). Je ([Seb35](https://github.com/Seb35), [twitter](https://twitter.com/sseb35)) suis disponible pour discuter de la forme exacte que pourrait prendre cette interface dans un but d’utilisation métier, à côté de l’interface actuelle probablement plus utile aux développeurs.

Utilisation avec curl
```bash
curl --data-binary @data/texte.txt http://127.0.0.1:8081/diff
```

Limitations
-----------

Sur DuraLex :

* pas de compréhension des listes d’articles, par exemple « les articles 31 et 32 sont ainsi modifié »

Déploiement
-----------

Il y a le fichier de configuration du service systemd dans le dossier `/docs`, celui-ci doit être placé dans `/usr/local/lib/systemd/system` et bien sûr le chemin de server.py peut être ajusté.

Pour le développement, il est possible de lancer le serveur via le script `scripts/autorestart`. Celui-ci permet de redémarrer le serveur Durafront dès qu’un des fichiers de Durafront, DuraLex ou SedLex change. Il faut créer les liens symboliques `/opt/DuraLex` et `/opt/SedLex` vers les destinations correctes.

License
-------

AGPLv3
