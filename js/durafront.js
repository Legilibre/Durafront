var diffs = {
	'amendement': null,
	'ppjl': null,	
	'vigueur': {
	}
};

$( function() {

	//$('#amendement').val('I. - L\'article 3 de la loi n° 46-2196 du 11 octobre 1946 créant un centre national du livre est ainsi rétabli :\n"Art. 3. - Le conseil d\'administration du Centre national du livre comprend parmi ses membres un député et un sénateur."\n\nII. - L\'article 230-45 du code de procédure pénale est ainsi modifié :\n1° Au premier alinéa, le mot "décret" est remplacé par "arrêté" ;\n2° Au quatrième alinéa, le mot "Le décret" est remplacé par "L\'arrêté" ;\n3° Au dernier alinéa, le mot "décret" est remplacé par "arrêté" ;\n4° À l\'avant-dernier alinéa, avant le mot "un député" est ajouté le mot "un juge, ".');

	//$('#amendement').val('Au deuxième alinéa, le mot "la" est remplacé par le mot "une".');

	//$('#article-pjl-ppl').val('L\'article 23 de la Constitution est complété par un alinéa ainsi rédigé :\n\n"Les fonctions de membre du Gouvernement sont également incompatibles, dans les conditions fixées par la loi organique, avec l’exercice d’une fonction exécutive ou de présidence d’assemblée délibérante au sein des collectivités régies par les titres XII et XIII, de leurs groupements et de certaines personnes morales qui en dépendent."');

	$('#amendement').val('Au premier alinéa, les mots « quarante députés ou quarante sénateurs » sont remplacés par les mots « trente députés ou trente sénateurs ».');

	$('#article-pjl-ppl').val('Au sixième alinéa de l’article 16 de la Constitution, les mots : « soixante députés ou soixante sénateurs » sont remplacés par les mots : « quarante députés ou quarante sénateurs ».');

	console.log(new Date().getMonth());
	console.log(new Date().getDate());
	var date = new Date();
	if( date.getMonth() == 0 && date.getDate() < 10 ) {
		$('#amendement').val('I. - Au premier alinéa, remplacer le mot « ' + (date.getFullYear()-1) + ' » par le mot « ' + date.getFullYear() + ' ».\n\nII. - ' + $('#amendement').val().replace('premier', 'troisième'));
		$('#article-pjl-ppl').val('Bonne année ' + (date.getFullYear()-1) + ' !\n\n-- Sinon voici l’exemple réel ci-dessous ------\n\n' + $('#article-pjl-ppl').val());
	}

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
			'data': JSON.stringify( { 'texteAmendement': $('#amendement').val(), 'texteArticle': $('#article-pjl-ppl').val() } ),
			'timeout': 120 * 1000,
			'dataType': 'json',
			'error': function(e) {
				if( e.status === 400 ) {
					$('#div-pjpl').html( '<p class="error">Mauvaise entrée, avez-vous bien entré un texte ?</p>' );
				} else if( e.status === 500 ) {
					$('#div-pjpl').html( '<p class="error">Erreur interne du serveur. Contactez seb35' + '@' + 'seb35.fr ou sur Twitter @sseb35.</p>' );
				} else {
					$('#div-pjpl').html( '<p class="error">Pas de réponse du serveur. Contactez seb35' + '@' + 'seb35.fr ou sur Twitter @sseb35.</p>' );
				}
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
				if( data['warnings'] ) {
					t = '<p class="warning">Avertissement : ' + (data['warnings'] !== true ? data['warnings'] : 'problèmes détectés') + '</p>';
				}
				for( var text in data ) {
					if( data['errors'] || text == 'warnings' || text == 'levels' || text == 'backtrace' ) {
						continue;
					}
					tmp = '';
					for( var article in data[text] ) {
						var text_fr;
						if( text.substr(0, 5) == 'code ' ) {
							text_fr = text.substr(5, 1).toUpperCase() + text.substr(6);
						} else if( text == 'anonymous law' ) {
							text_fr = '(projet de loi)';
						} else {
							var r = text.match(/^([a-zé ]+)(\d{4})-(\d{2})-(\d{2}) (\d{2,4}-\d+)$/i);
							text_fr = r[1].substr(0, 1).toUpperCase() + r[1].substr(1) + 'n°&nbsp;' + r[5] + ' du ' + ( r[4] === '1' ? '1er' : r[4] ) + ' ' + mois[r[3]] + ' ' + r[2];
						}
						if( data[text][article]['errors'] ) {
							tmp += '<div class="article ' + data[text][article]['type'] + '"><h2>Article ' + article + '</h2><p class="error">Erreur lors de la fusion' + (data[text][article]['errors'] !== true ? ': ' + data[text][article]['errors'] : '') + '</p></div>';
						} else {
							diffs.ppjl = data[text][article].text;
							var article_fr = article == 'anonymous article' ? '(article non-spécifié)' : article;
							tmp += '<div class="article ' + data[text][article]['type'] + '"><h2>Article ' + article_fr + '</h2><p>' + data[text][article]['text'].trim().replace(/\n\n/g,'</p><p>').replace(/<del amendement="[a-z0-9-]+"><\/del>\n<del amendement="[a-z0-9-]+"><\/del>\n<del /g,'</p><p><del ').replace(/<\/del>\n<del amendement="[a-z0-9-]+"><\/del>\n<del amendement="[a-z0-9-]+"><\/del>/g,'</del></p><p>').replace(/<ins amendement="[a-z0-9-]+"><\/ins>\n<ins amendement="[a-z0-9-]+"><\/ins>\n<ins /g,'</p><p><ins ').replace(/<\/ins>\n<ins amendement="[a-z0-9-]+"><\/ins>\n<ins amendement="[a-z0-9-]+"><\/ins>/g,'</ins></p><p>').replace(/\n/g,'<br />') + '</p></div>';
						}
					}
					if( tmp ) {
						t += '<div class="texte"><h1>&gt;&nbsp;' + text_fr + '</h1>' + tmp + '</div>';
					}
				}
				if( e.levels && e.levels[0] ) {
					diffs.vigueur = [ [] ];
					t += '<div class="interlude">Qui devient sur la loi en vigueur…</div>';
					for( var i in e.levels[0] ) {
						tmp = '';
						diffs.vigueur[0][i] = {};
						for( var text in e.levels[0][i].data ) {
							if( e.levels[0][i].data['errors'] || text == 'warnings' || text == 'backtrace' ) {
								continue;
							}
							diffs.vigueur[0][i][text] = {};
							var text_fr;
							if( text.substr(0, 5) == 'code ' ) {
								text_fr = text.substr(5, 1).toUpperCase() + text.substr(6);
							} else if( text == 'anonymous law' ) {
								text_fr = '(loi non-spécifiée)';
							} else {
								var r = text.match(/^([a-zé ]+)(\d{4})-(\d{2})-(\d{2}) (\d{2,4}-\d+)$/i);
								text_fr = r[1].substr(0, 1).toUpperCase() + r[1].substr(1) + 'n°&nbsp;' + r[5] + ' du ' + ( r[4] === '1' ? '1er' : r[4] ) + ' ' + mois[r[3]] + ' ' + r[2];
							}
							for( var article in e.levels[0][i].data[text] ) {
								diffs.vigueur[0][i][text][article] = e['levels'][0][i]['data'][text][article]['text'];
								var article_fr = article == 'anonymous article' ? '(article non-spécifié)' : article;
								article_fr += i == 0 ? '&nbsp;<small>(si la proposition/projet de loi est adopté/e)</small>' : '&nbsp;<small>(si la proposition/projet de loi et l’amendement sont adoptés)</small>';
								tmp += '<div class="article ' + e['levels'][0][i]['data'][text][article]['type'] + '"><h2>Article ' + article_fr + '</h2><p>' + e['levels'][0][i]['data'][text][article]['text'].trim().replace(/\n\n/g,'</p><p>').replace(/<del amendement="[a-z0-9-]+"><\/del>\n<del amendement="[a-z0-9-]+"><\/del>\n<del /g,'</p><p><del ').replace(/<\/del>\n<del amendement="[a-z0-9-]+"><\/del>\n<del amendement="[a-z0-9-]+"><\/del>/g,'</del></p><p>').replace(/<ins amendement="[a-z0-9-]+"><\/ins>\n<ins amendement="[a-z0-9-]+"><\/ins>\n<ins /g,'</p><p><ins ').replace(/<\/ins>\n<ins amendement="[a-z0-9-]+"><\/ins>\n<ins amendement="[a-z0-9-]+"><\/ins>/g,'</ins></p><p>').replace(/\n/g,'<br />') + '</p></div>';
							}
						}
						t += '<div class="texte"><h1>&gt;&nbsp;' + text_fr + '</h1>' + tmp + '</div>';
					}
					tmp = '';
					for( var text in diffs.vigueur[0][0] ) {
						var text_fr;
						if( diffs.vigueur[0][0]['errors'] || text == 'warnings' || text == 'backtrace' ) {
							continue;
						}
						if( text.substr(0, 5) == 'code ' ) {
							text_fr = text.substr(5, 1).toUpperCase() + text.substr(6);
						} else if( text == 'anonymous law' ) {
							text_fr = '(loi non-spécifiée)';
						} else {
							var r = text.match(/^([a-zé ]+)(\d{4})-(\d{2})-(\d{2}) (\d{2,4}-\d+)$/i);
							text_fr = r[1].substr(0, 1).toUpperCase() + r[1].substr(1) + 'n°&nbsp;' + r[5] + ' du ' + ( r[4] === '1' ? '1er' : r[4] ) + ' ' + mois[r[3]] + ' ' + r[2];
						}
						for( var article in diffs.vigueur[0][0][text] ) {
							diff_ppjl_ppjl_amendement = thirdDiff(diffs.vigueur[0][0][text][article], diffs.vigueur[0][1][text][article]);
							var article_fr = article == 'anonymous article' ? '(article non-spécifié)' : article;
							article_fr += '&nbsp;<small>(sous l’hypothèse que le projet/proposition de loi est adopté : action spécifique de l’amendement)</small>';
							tmp += '<div class="article"><h2>Article ' + article_fr + '</h2><p>' + diff_ppjl_ppjl_amendement.trim().replace(/\n\n/g,'</p><p>').replace(/<del amendement="[a-z0-9-]+"><\/del>\n<del amendement="[a-z0-9-]+"><\/del>\n<del /g,'</p><p><del ').replace(/<\/del>\n<del amendement="[a-z0-9-]+"><\/del>\n<del amendement="[a-z0-9-]+"><\/del>/g,'</del></p><p>').replace(/<ins amendement="[a-z0-9-]+"><\/ins>\n<ins amendement="[a-z0-9-]+"><\/ins>\n<ins /g,'</p><p><ins ').replace(/<\/ins>\n<ins amendement="[a-z0-9-]+"><\/ins>\n<ins amendement="[a-z0-9-]+"><\/ins>/g,'</ins></p><p>').replace(/\n/g,'<br />') + '</p></div>';
						}
						t += '<div class="texte"><h1>&gt;&nbsp;' + text_fr + '</h1>' + tmp + '</div>';
					}
				}
				duralex = e.duralex;
				delete e.duralex;
				t += '<div class="texte"><h1>#&nbsp;Résultats intermédiaires</h1>' + ( data['backtrace'] ? '<h2>Backtrace de l’erreur</h2><pre>' + data['backtrace'].trim().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g, '<br />')+'</pre>' : '' ) + '<h2>Fusion des diffs</h2><pre>' + JSON.stringify(data, null, 2).trim().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g, '<br />') + '</pre><h2>Arbre DuraLex+SedLex</h2><pre>' + JSON.stringify(duralex, null, 2).trim().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g, '<br />') + '</pre></div>';
				$('#div-pjpl').html( t );
			}
		});

		return true;
	});
});

function thirdDiff(diff1, diff2) {

	var l1 = diff1.length,
	    l2 = diff2.length,
	    splited_diff1 = diff1.split(/(<ins amendement="[0-9a-f-]+">.*?<\/ins>|<del amendement="[0-9a-f-]+">.*?<\/del>)/),
	    splited_diff2 = diff2.split(/(<ins amendement="[0-9a-f-]+">.*?<\/ins>|<del amendement="[0-9a-f-]+">.*?<\/del>)/),
	    chunks_diff1 = [],
	    chunks_diff2 = [],
	    counter = 0,
	    m;

	l0 = 0;
	for( var ic=0; ic < splited_diff1.length; ic++ ) {
		if( /^<ins amendement="[0-9a-f-]+">(.*?)<\/ins>$/.test( splited_diff1[ic] ) ) {
			m = /^<ins amendement="[0-9a-f-]+">(.*?)<\/ins>$/.exec( splited_diff1[ic] );
			chunks_diff1[ic] = [ counter, 1, m[1].length ];
		} else if( /^<del amendement="[0-9a-f-]+">(.*?)<\/del>$/.test( splited_diff1[ic] ) ) {
			m = /^<del amendement="[0-9a-f-]+">(.*?)<\/del>$/.exec( splited_diff1[ic] );
			chunks_diff1[ic] = [ counter, -1, m[1].length ];
			l0 += m[1].length;
		} else {
			chunks_diff1[ic] = [ counter, 0, splited_diff1[ic].length ];
			l0 += splited_diff1[ic].length;
		}
		counter += splited_diff1[ic].length;
	}

	counter = 0;
	for( var ic=0; ic < splited_diff2.length; ic++ ) {
		if( /^<ins amendement="[0-9a-f-]+">(.*?)<\/ins>$/.test( splited_diff2[ic] ) ) {
			m = /^<ins amendement="[0-9a-f-]+">(.*?)<\/ins>$/.exec( splited_diff2[ic] );
			chunks_diff2[ic] = [ counter, 1, m[1].length ];
		} else if( /^<del amendement="[0-9a-f-]+">(.*?)<\/del>$/.test( splited_diff2[ic] ) ) {
			m = /^<del amendement="[0-9a-f-]+">(.*?)<\/del>$/.exec( splited_diff2[ic] );
			chunks_diff2[ic] = [ counter, -1, m[1].length ];
		} else {
			chunks_diff2[ic] = [ counter, 0, splited_diff2[ic].length ];
		}
		counter += splited_diff2[ic].length;
	}

	var i1 = 0, icounter1 = 0, chunk1,
	    i2 = 0, icounter2 = 0, chunk2;

	var thirdDiff = '';
	for( counter = 0; counter < l0; counter++ ) {
		chunk1 = chunks_diff1[i1];
		chunk2 = chunks_diff2[i2];
		text1 = /(<ins amendement="[0-9a-f-]+">(.*?)<\/ins>|<del amendement="[0-9a-f-]+">(.*?)<\/del>)/.exec(splited_diff1[i1]);
		text2 = /(<ins amendement="[0-9a-f-]+">(.*?)<\/ins>|<del amendement="[0-9a-f-]+">(.*?)<\/del>)/.exec(splited_diff2[i2]);
		text1 = text1 ? ( text1[2] ? text1[2] : text1[3] ) : splited_diff1[i1];
		text2 = text2 ? ( text2[2] ? text2[2] : text2[3] ) : splited_diff2[i2];
		if( chunk1[1] === 0 && chunk2[1] === 0 && splited_diff1[i1] === splited_diff2[i2] ) {
			thirdDiff += splited_diff1[i1];
			i1 += 1;
			i2 += 1;
			counter += chunk1[2]-1;
		}
		else if( chunk1[1] === -1 && chunk2[1] === 0 ) {
			m = /^<del amendement="[0-9a-f-]+">(.*?)<\/del>$/.exec( splited_diff1[i1] );
			thirdDiff += '<ins>' + m[1] + '</ins>';
			i1 += 1;
			i2 += 1;
			counter += chunk2[2]-1;
		}
		else if( chunk1[1] === 0 && chunk2[1] === -1 ) {
			m = /^<del amendement="[0-9a-f-]+">(.*?)<\/del>$/.exec( splited_diff2[i2] );
			thirdDiff += '<del>' + m[1] + '</del>';
			i1 += 1;
			i2 += 1;
			counter += chunk1[2]-1;
		}
		else if( chunk1[1] === -1 && chunk2[1] === -1 ) {
			// nop
			i1 += 1;
			i2 += 1;
			counter += text1.length-1;
		}
		else if( chunk1[1] === 1 && chunk2[1] === 1 ) {
			if( text1 === text2 ) {
				thirdDiff += text1;
			} else {
				thirdDiff += '<del>' + text1 + '</del><ins>' + text2 + '</ins>';
			}
			i1 += 1;
			i2 += 1;
			counter += -1;
		}
/*
AA'  AB' A'B' Implémenté
C    C   C    *
R    C   A    *
A    -   R    
C    R   R    *
R    R   -    
-    A   A    
A == A   C    *
A != A   RA   *
*/
	}
	return thirdDiff;
}

