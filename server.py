# coding: utf-8
"""
DuraLex/SedLex server.

It receives an amendment in the variable "amendment" of a POST request to /diff,
and returns an HTML diff.
"""

import http.server
import sys
import json
import re

sys.path.insert(0, "/opt/SedLex")
sys.path.insert(0, "/opt/DuraLex")

import duralex.alinea_parser
import duralex.AbstractVisitor
import duralex.ResolveLookbackReferencesVisitor
import duralex.ForkReferenceVisitor
import duralex.ResolveFullyQualifiedDefinitionsVisitor
import duralex.ResolveFullyQualifiedReferencesVisitor
import duralex.FixMissingCodeOrLawReferenceVisitor
import duralex.SortReferencesVisitor
import duralex.SwapDefinitionAndReferenceVisitor
import duralex.RemoveQuotePrefixVisitor
import duralex.DeleteUUIDVisitor
import duralex.DeleteParentVisitor
import duralex.DeleteEmptyChildrenVisitor
import sedlex.AddArcheoLexFilenameVisitor
import sedlex.AddDiffVisitor

class CollectDiffsVisitor(duralex.AbstractVisitor):

    def __init__(self):
        self.current_article_id = None
        self.current_law_type = None
        self.current_law_id = None
        self.current_law_date = None
        self.diffs = {}
        self.exactdiffs = {}
        self.texts = {}
        super(CollectDiffsVisitor, self).__init__()

    def visit_article_reference_node(self, node, post):
        if not post or 'id' not in node:
            return
        self.current_article_id = node['id']

    def visit_article_definition_node(self, node, post):
        if not post or 'id' not in node:
            return
        self.current_article_id = node['id']

    def visit_law_reference_node(self, node, post):
        if not post or 'id' not in node or 'lawDate' not in node or 'lawType' not in node:
            return
        self.current_law_type = node['lawType']
        self.current_law_id = node['id']
        self.current_law_date = node['lawDate']

    def visit_code_reference_node(self, node, post):
        if not post or 'id' not in node:
            return
        self.current_law_type = 'code'
        self.current_law_id = node['id']
        self.current_law_date = None

    def visit_edit_node(self, node, post):
        if not post or 'diff' not in node or 'exactDiff' not in node:
            return
        if self.current_law_type == 'code':
            law_name = self.current_law_type + ' ' + self.current_law_id
            article_id = self.current_article_id
        elif self.current_law_type == None and self.current_law_date == None and self.current_law_id == None:
            law_name = 'anonymous law'
            article_id = 'anonymous article'
        else:
            law_name = self.current_law_type + ' ' + self.current_law_date + ' ' + self.current_law_id
            article_id = self.current_article_id
        if law_name not in self.diffs:
            self.diffs[law_name] = {}
        if article_id not in self.diffs[law_name]:
            self.diffs[law_name][article_id] = {}
        if law_name not in self.exactdiffs:
            self.exactdiffs[law_name] = {}
        if article_id not in self.exactdiffs[law_name]:
            self.exactdiffs[law_name][article_id] = {}
        if law_name not in self.texts:
            self.texts[law_name] = {}
        self.diffs[law_name][article_id][node['uuid']] = node['diff']
        self.exactdiffs[law_name][article_id][node['uuid']] = node['exactDiff']
        self.texts[law_name][article_id] = node['text']
        self.current_article_id = None
        self.current_law_type = None
        self.current_law_id = None
        self.current_law_date = None


class DuraLexSedLexHTTPRequestHandler(http.server.BaseHTTPRequestHandler):

    server_version = "DuraLexSedLexHTTP/0.1"

    def do_GET(self):

        self.do_POST()

    def do_POST(self):

        if self.path not in ['/rawtree', '/tree', '/diff']:
            self.send_error(400)
            return

        length = self.headers.get('content-length')
        if length:
            data = str(self.rfile.read(int(length)), 'utf-8')
        else:
            self.send_error(400)
            return

        try:
            data = json.loads(data)
            amendement = data['texteAmendement'] if 'texteAmendement' in data else None
            article = data['texteArticle'] if 'texteArticle' in data else None
            numeroTexte = data['numeroTexte'] if 'numeroTexte' in data else None
            numeroArticle = data['numeroArticle'] if 'numeroArticle' in data else None
            numeroAmendement = data['numeroAmendement'] if 'numeroAmendement' in data else None
        except:
            amendment = data
            article = None
            numeroTexte = None
            numeroArticle = None
            numeroAmendement = None

        if False and amendement and numeroArticle and numeroTexte: # 
            article = getArticleFromTricoteuses(numeroTexte, numeroArticle)
        elif False and numeroAmendement and numeroTexte:
            uid = 'AMANR5L15' + 'SEA717460' + 'B' + numeroTexte + 'P0D1N' + numeroAmendement
            amendement, numeroArticle = getAmendmentFromTricoteuses(numeroTexte, numeroAmendement)
            article = getArticleFromTricoteuses(numeroTexte, numeroArticle)
        elif not amendement:
            self.send_error(400)
            return

        # Quick hack to be able to copy directly texts from the Assemblée’s website
        amendement = re.sub('’', "'", amendement)
        amendement = re.sub('‑', '-', amendement) # U+2011 → U+002D
        amendement = re.sub(r'( *»|« *)', '"', amendement)
        if article:
            article = re.sub('’', "'", article)
            article = re.sub('‑', '-', article) # U+2011 → U+002D
            article = re.sub(r'( *»|« *)', '"', article)

        # Hacky hack so that some amendments from the Sénat work for testing purposes
        amendement = re.sub(r'remplacer les mots *:?\n([^\n]+)\npar les mots *:?\n([^\n]+)', r'les mots\n"\1"\n sont remplacés par les mots\n"\2"', amendement, flags=re.IGNORECASE)

        json_tree = ''
        diff = ''
        if self.path == '/rawtree':
            json_tree = self.handle_rawtree(amendement)
        elif self.path == '/tree':
            json_tree = self.handle_tree(amendement)
        elif self.path == '/diff':
            json_tree = self.handle_diff(amendement, article)

        if json_tree:
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", len(bytes(json_tree,'utf-8')))
            self.end_headers()
            self.wfile.write(bytes(json_tree, 'utf-8'))
        else:
            self.send_error(500)

    def handle_rawtree(self, text):

        tree = duralex.tree.create_node(None, {'content': text})

        duralex.alinea_parser.parse_alineas(text, tree)
        duralex.DeleteUUIDVisitor().visit(tree)
        duralex.DeleteParentVisitor().visit(tree)
        duralex.DeleteEmptyChildrenVisitor().visit(tree)

        json_tree = json.dumps(tree, sort_keys=True, indent=2, ensure_ascii=False)

        return json_tree

    def handle_tree(self, text):

        tree = duralex.tree.create_node(None, {'content': text})

        duralex.alinea_parser.parse_alineas(text, tree)
        duralex.ResolveLookbackReferencesVisitor().visit(tree)
        duralex.ForkReferenceVisitor().visit(tree)
        duralex.ResolveFullyQualifiedDefinitionsVisitor().visit(tree)
        duralex.ResolveFullyQualifiedReferencesVisitor().visit(tree)
        duralex.FixMissingCodeOrLawReferenceVisitor().visit(tree)
        duralex.SortReferencesVisitor().visit(tree)
        duralex.SwapDefinitionAndReferenceVisitor().visit(tree)
        duralex.RemoveQuotePrefixVisitor().visit(tree)
        duralex.DeleteUUIDVisitor().visit(tree)
        duralex.DeleteParentVisitor().visit(tree)
        duralex.DeleteEmptyChildrenVisitor().visit(tree)

        json_tree = json.dumps(tree, sort_keys=True, indent=2, ensure_ascii=False)

        return json_tree

    def handle_diff(self, text, article=None):

        errors_diff = False
        try:
            tree = duralex.tree.create_node(None, {'content': text})

            duralex.alinea_parser.parse_alineas(text, tree)
            duralex.ResolveLookbackReferencesVisitor().visit(tree)
            duralex.ForkReferenceVisitor().visit(tree)
            duralex.ResolveFullyQualifiedDefinitionsVisitor().visit(tree)
            duralex.ResolveFullyQualifiedReferencesVisitor().visit(tree)
            duralex.FixMissingCodeOrLawReferenceVisitor().visit(tree)
            duralex.SortReferencesVisitor().visit(tree)
            duralex.SwapDefinitionAndReferenceVisitor().visit(tree)
            duralex.RemoveQuotePrefixVisitor().visit(tree)
            duralex.DeleteEmptyChildrenVisitor().visit(tree)

            sedlex.AddArcheoLexFilenameVisitor.AddArcheoLexFilenameVisitor("/opt/Archeo-Lex/textes/articles/codes").visit(tree)
            sedlex.AddDiffVisitor.AddDiffVisitor(article).visit(tree)
        except Exception as e:
            if len(e.args):
                errors_diff = e.args[0] + ' (1)'
            else:
                errors_diff = True

        duralex.DeleteParentVisitor().visit(tree)

        if errors_diff:
            data = { 'data': { 'errors': errors_diff }, 'duralex': tree }
            return json.dumps(data, sort_keys=True, indent=None, ensure_ascii=False, separators=(',', ':'))

        diffsvisitor = CollectDiffsVisitor()
        diffsvisitor.visit(tree)
        diffs = diffsvisitor.diffs
        exactdiffs = diffsvisitor.exactdiffs
        texts = diffsvisitor.texts
        exactdiffs_json = json.dumps(exactdiffs, sort_keys=True, indent=2, ensure_ascii=False)

        #return json_tree + exactdiffs_json

        try:
            self.mergeExactDiffs(exactdiffs, texts)
        except Exception as e:
            if len(e.args):
                exactdiffs['errors'] = e.args[0] + ' (2)'
            else:
                exactdiffs['errors'] = True

        #print(exactdiffs)

        data = { 'data': exactdiffs, 'duralex': tree }

        return json.dumps(data, sort_keys=True, indent=None, ensure_ascii=False, separators=(',', ':'))

    def mergeExactDiffs(self, exactdiffs, texts):

        for text in exactdiffs:
            for article in exactdiffs[text]:
                if 'text' not in exactdiffs[text][article]:
                    exactdiffs[text][article]['text'] = texts[text][article] if article in texts[text] else ''
                if 'type' not in exactdiffs[text][article]:
                    exactdiffs[text][article]['type'] = None
                if 'merge_indexes' not in exactdiffs[text][article]:
                    if exactdiffs[text][article]['text'] == None:
                        exactdiffs[text][article]['text'] = ''
                    lentext = len(exactdiffs[text][article]['text'])
                    exactdiffs[text][article]['merge_indexes'] = { (0, lentext): (0, lentext), (lentext,lentext+1): (lentext, lentext+1) } if lentext else { (0, 1): (0, 1) }
                for editOperation in exactdiffs[text][article]:
                    if editOperation == 'merge_indexes' or editOperation == 'text' or editOperation == 'type' or editOperation == 'errors':
                        continue
                    try:
                        exactdiffs[text][article] = self.renderExactDiff(exactdiffs[text][article], editOperation)
                    except Exception as e:
                        if len(e.args):
                            exactdiffs[text][article]['errors'] = e.args[0]
                        else:
                            exactdiffs[text][article]['errors'] = True
                        break

                tag_split = [x for x in re.split('(<(?:del|ins) amendement="[a-z0-9-]+">.*?<\/(?:del|ins)>)', exactdiffs[text][article]['text']) if x]
                tags = []
                next = False
                for i in range(0, len(tag_split)):
                    if i+1 < len(tag_split) and not next and ((re.match('^<dev ', tag_split[i]) and re.match('^<ins ', tag_split[i+1])) or (re.match('^<ins ', tag_split[i]) and re.match('^<del ', tag_split[i+1]))):
                        tags.append(tag_split[i+1])
                        tags.append(tag_split[i])
                        next = True
                    elif not next:
                        tags.append(tag_split[i])
                    else:
                        next = False
                exactdiffs[text][article]['text'] = ''.join(tags)

                # Quick hack because typographic apostrophes ( ’ ) are nicer than ugly apostrophes ( ' )
                exactdiffs[text][article]['text'] = re.sub("'", '’', exactdiffs[text][article]['text'])

                exactdiffs[text][article]['merge_indexes'] = { '['+str(x[0])+','+str(x[1])+'[': ('['+str(exactdiffs[text][article]['merge_indexes'][x][0])+','+str(exactdiffs[text][article]['merge_indexes'][x][1])+'[' if exactdiffs[text][article]['merge_indexes'][x] else None) for x in exactdiffs[text][article]['merge_indexes'] }

        return exactdiffs

    def renderExactDiff(self, exactdiffsArticle, editOperation):

        type = 'modify'
        exactdiff = exactdiffsArticle[editOperation]
        if exactdiff.startswith('--- /dev/null\n'):
            type = 'add'
        exactdiff = re.sub(r'^--- .*\n', '', exactdiff)
        if exactdiff.startswith('\+\+\+ /dev/null\n'):
            type = 'remove'
        exactdiff = re.sub(r'^\+\+\+ .*\n', '', exactdiff)
        text = exactdiffsArticle['text']

        coords = None
        lines = re.split(r'(@@ -\d+,\d+ \+\d+,\d+ @@\n)', exactdiff)
        for line in lines:
            if not line:
                continue
            if not coords:
                s = re.match(r'@@ -(\d+),(\d+) \+(\d+),(\d+) @@\n', line)
                coords = (int(s.group(1))-1, int(s.group(2)), int(s.group(3))-1, int(s.group(4)))
                if coords[0] != coords[2]:
                    raise NotImplementedError('It seems it happens: should be properly thought')
            else:
                del_chars = '\n'.join([s[1:] for s in line.splitlines() if s.startswith('-')])
                ins_chars = '\n'.join([s[1:] for s in line.splitlines() if s.startswith('+')])
                del_html = '\n'.join(['<del amendement="' + editOperation + '">' + s[1:] + '</del>' for s in line.splitlines() if s.startswith('-')])
                ins_html = '\n'.join(['<ins amendement="' + editOperation + '">' + s[1:] + '</ins>' for s in line.splitlines() if s.startswith('+')])
                if len(del_chars) != coords[1]:
                    raise Exception('Not coherent')
                if len(ins_chars) != coords[3]:
                    raise Exception('Not coherent')
                #print(coords)
                #print(del_chars)
                #print(ins_chars)
                if coords[3] > 0:
                    #print('add')

                    len_ins_html = len(ins_html)

                    # First we search the active interval from the original text where we will insert our new piece of text
                    interval = [x for x in exactdiffsArticle['merge_indexes'].keys() if coords[0] >= x[0] and coords[0] < x[1]]
                    if len(interval) != 1:
                        raise Exception('Internal merge error (1,'+str(len(interval))+')')
                    interval = interval[0]
                    if not exactdiffsArticle['merge_indexes'][interval]:
                        raise Exception('Merge conflict: another amendment already deleted all or a part of this modified text')
                    #print(interval)
                    #print(exactdiffsArticle['merge_indexes'])

                    # The "new index" is in the current text (possibly with already-inserted pieces of new texts)
                    new_index = exactdiffsArticle['merge_indexes'][interval][0] + coords[0] - interval[0]
                    text = text[:new_index] + ins_html + text[new_index:]

                    # The "first slipping [entire] interval" is either the active interval or the next interval after the active interval depending if we have to cut the active interval or not
                    first_slipping_interval = interval[0] if coords[0] == interval[0] else interval[1]
                    for x in exactdiffsArticle['merge_indexes']:
                        if x[0] >= first_slipping_interval and exactdiffsArticle['merge_indexes'][x]:
                            exactdiffsArticle['merge_indexes'][x] = (exactdiffsArticle['merge_indexes'][x][0]+len_ins_html, exactdiffsArticle['merge_indexes'][x][1]+len_ins_html)

                    # Except if we add our new piece of text at the beginning of the active interval, we have to split our active interval
                    if coords[0] != interval[0]:
                        im_interval = exactdiffsArticle['merge_indexes'][interval]
                        del exactdiffsArticle['merge_indexes'][interval]
                        exactdiffsArticle['merge_indexes'][(interval[0], coords[0])] = (im_interval[0], im_interval[0]+coords[0]-interval[0])
                        exactdiffsArticle['merge_indexes'][(coords[0], interval[1])] = (im_interval[1]+len_ins_html-interval[1]+coords[0], im_interval[1]+len_ins_html)

                    #old_index = min([x for x in exactdiffsArticle['merge_indexes'].keys() if x >= coords[0]])
                    #new_index = exactdiffsArticle['merge_indexes'][old_index]
                    #text = text[:new_index] + ins_html + text[new_index:]
                    #exactdiffsArticle['merge_indexes'][old_index] = new_index + len(ins_html)
                    #print(exactdiffsArticle['merge_indexes'])
                if coords[1] != 0:
                    #print('remove')

                    len_del_html = len(del_html)-coords[1]

                    # First we search the active interval from the original text where we will remove our new piece of text
                    interval = [x for x in exactdiffsArticle['merge_indexes'].keys() if coords[0] >= x[0] and coords[0] < x[1]]
                    if len(interval) != 1:
                        raise Exception('Internal merge error (2,'+str(len(interval))+')')
                    interval = interval[0]
                    if not exactdiffsArticle['merge_indexes'][interval]:
                        raise Exception('Merge conflict: another amendment already deleted all or a part of this modified text')
                    if coords[0] + coords[1] > interval[1]:
                        raise Exception('Merge conflict: we want to remove a piece of text already modified by another amendment')
                    #print(interval)
                    #print(exactdiffsArticle['merge_indexes'])

                    # The "new index" is in the current text (possibly with already-inserted pieces of new texts)
                    new_index = exactdiffsArticle['merge_indexes'][interval][0] + coords[0] - interval[0]
                    text = text[:new_index] + del_html + text[new_index+coords[1]:]

                    # The "first slipping [entire] interval" is the next interval after the active interval
                    first_slipping_interval = interval[1]
                    for x in exactdiffsArticle['merge_indexes']:
                        if x[0] >= first_slipping_interval and exactdiffsArticle['merge_indexes'][x]:
                            exactdiffsArticle['merge_indexes'][x] = (exactdiffsArticle['merge_indexes'][x][0]+len_del_html, exactdiffsArticle['merge_indexes'][x][1]+len_del_html)

                    # We have to split the active interval into 1, 2, or 3 sub-intervals and tag one of these sub-intervals as deleted
                    im_interval = exactdiffsArticle['merge_indexes'][interval]
                    del exactdiffsArticle['merge_indexes'][interval]
                    exactdiffsArticle['merge_indexes'][(coords[0], coords[0]+coords[1])] = None
                    if coords[0] + coords[1] != interval[1]:
                        exactdiffsArticle['merge_indexes'][(coords[0]+coords[1], interval[1])] = (im_interval[1]+len_del_html-interval[1]+coords[0]+coords[1],im_interval[1]+len_del_html)
                    if coords[0] != interval[0]:
                        exactdiffsArticle['merge_indexes'][(interval[0], coords[0])] = (im_interval[0], im_interval[0]+coords[0]-interval[0])

                    #print(exactdiffsArticle['merge_indexes'])
                    #print((interval, im_interval,coords,len_del_html))
                    #old_index = min([x for x in exactdiffsArticle['merge_indexes'].keys() if x >= coords[0]])
                    #new_index = exactdiffsArticle['merge_indexes'][old_index]
                    #text = text[:new_index] + ins_html + text[new_index:]
                    #exactdiffsArticle['merge_indexes'][old_index] = new_index + len(ins_html)
                coords = None
                if exactdiffsArticle['type'] == None:
                    if type == 'add':
                        exactdiffsArticle['type'] = 'added'
                    elif type == 'remove':
                        exactdiffsArticle['type'] = 'deleted'
                    elif type == 'modify':
                        exactdiffsArticle['type'] = 'modified'
                elif type != 'modify':
                    raise Exception('Merge error: we tried to add or remove an article and then modify it')
            
        #print(lines)
        #print(exactdiff)
        exactdiffsArticle['text'] = text
        #print('in ' + editOperation)
        #print(text)

        return exactdiffsArticle


if __name__ == "__main__":

    httpd = http.server.HTTPServer(('127.0.0.1', 8081), DuraLexSedLexHTTPRequestHandler)
    sa = httpd.socket.getsockname()
    print("Serving HTTP on", sa[0], "port", sa[1], "...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print()
        httpd.server_close()
        sys.exit(0)

# vim: set ts=4 sw=4 sts=4 et:
