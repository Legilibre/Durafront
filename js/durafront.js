$( function() {

	//$('#amendement').val('I. - L\'article 3 de la loi n° 46-2196 du 11 octobre 1946 créant un centre national du livre est ainsi rétabli :\n"Art. 3. - Le conseil d\'administration du Centre national du livre comprend parmi ses membres un député et un sénateur."\n\nII. - L\'article 230-45 du code de procédure pénale est ainsi modifié :\n1° Au premier alinéa, le mot "décret" est remplacé par "arrêté" ;\n2° Au quatrième alinéa, le mot "Le décret" est remplacé par "L\'arrêté" ;\n3° Au dernier alinéa, le mot "décret" est remplacé par "arrêté" ;\n4° À l\'avant-dernier alinéa, avant le mot "un député" est ajouté le mot "un juge, ".');

	$('#amendement').val('Au deuxième alinéa, le mot "la" est remplacé par le mot "une".');

	$('#article-pjl-ppl').val('L\'article 23 de la Constitution est complété par un alinéa ainsi rédigé :\n\n"Les fonctions de membre du Gouvernement sont également incompatibles, dans les conditions fixées par la loi organique, avec l’exercice d’une fonction exécutive ou de présidence d’assemblée délibérante au sein des collectivités régies par les titres XII et XIII, de leurs groupements et de certaines personnes morales qui en dépendent."');

	$('#amendement, #article-pjl-ppl').keyup( function(e) {

		if( e.originalEvent.keyCode !== 13 || e.originalEvent.ctrlKey !== true ) {
			return true;
		}

		$('#div-pjpl').html( 'Calcul en cours…' );

		/*$.post( '/durafront/server/tree', $('#amendement').text(), function(e) {
			console.log(e);
		});*/

		$.ajax({
			'type': 'POST',
			'url': '/durafront/server/diff',
			//'data': $('#amendement').val(),
			'data': JSON.stringify( { 'texteAmendement': $('#amendement').val(), 'texteArticle': $('#article-pjl-ppl').val() } ),
			'timeout': 120 * 1000,
			'dataType': 'json',
			'error': function(e) {
				$('#div-pjpl').html( '<p class="error">Pas de réponse du serveur. Contactez seb35' + '@' + 'seb35.fr ou sur Twitter @sseb35.</p>' );
			},
			'success': function(e) {

				console.debug(e);

				var mois = { '01': 'janvier', '02': 'février', '03': 'mars', '04': 'avril', '05': 'mai', '06': 'juin', '07': 'juillet', '08': 'août', '09': 'septembre', '10': 'octobre', '11': 'novembre', '12': 'décembre' };

				data = e['data']
				duralex = e['duralex']

				t = '';
				if( data['errors'] ) {
					t = '<p class="error">Erreur globale lors de la fusion' + (data['errors'] !== true ? ': ' + data['errors'] : '') + '</p>';
				}
				for( var text in data ) {
					if( data['errors'] ) {
						continue;
					}
					tmp = '';
					for( var article in data[text] ) {
						var text_fr;
						if( text.substr(0, 5) == 'code ' ) {
							text_fr = text.substr(5, 1).toUpperCase() + text.substr(6);
						} else if( text == 'anonymous law' ) {
							text_fr = text;
						} else {
							var r = text.match(/^([a-zé ]+)(\d{4})-(\d{2})-(\d{2}) (\d{2,4}-\d+)$/i);
							text_fr = r[1].substr(0, 1).toUpperCase() + r[1].substr(1) + 'n°&nbsp;' + r[5] + ' du ' + ( r[4] === '1' ? '1er' : r[4] ) + ' ' + mois[r[3]] + ' ' + r[2];
						}
						if( data[text][article]['errors'] ) {
							tmp += '<div class="article ' + data[text][article]['type'] + '"><h2>Article ' + article + '</h2><p class="error">Erreur lors de la fusion' + (data[text][article]['errors'] !== true ? ': ' + data[text][article]['errors'] : '') + '</p></div>';
						} else {
							tmp += '<div class="article ' + data[text][article]['type'] + '"><h2>Article ' + article + '</h2><p>' + data[text][article]['text'].trim().replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br />') + '</p></div>';
						}
					}
					if( tmp ) {
						t += '<div class="texte"><h1>&gt;&nbsp;' + text_fr + '</h1>' + tmp + '</div>';
					}
				}
				duralex = e.duralex;
				delete e.duralex;
				t += '<div class="texte"><h1>#&nbsp;Résultats intermédiaires</h1><h2>Fusion des diffs</h2><pre>' + JSON.stringify(data, null, 2).trim().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g, '<br />') + '</pre><h2>Arbre DuraLex+SedLex</h2><pre>' + JSON.stringify(duralex, null, 2).trim().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g, '<br />') + '</pre></div>';
				$('#div-pjpl').html( t );
			}
		});

		return true;
	});
});
