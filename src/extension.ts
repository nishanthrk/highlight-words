'use strict';
import { commands, ExtensionContext, window, workspace, Position, Selection, Range } from 'vscode';
import HighlightConfig from './config'
import Highlight from './highlight'

export function activate(context: ExtensionContext) {
    let highlight = new Highlight()
    let configValues

    commands.registerCommand('highlightwords.addRegExpHighlight', function () {
        window.showInputBox({ prompt: 'Enter expression' })
            .then(word => {
                highlight.addRegExp(word)
            });
    });

    commands.registerCommand('highlightwords.addHighlight', function () {
        highlight.addSelected()
    });

    commands.registerCommand('highlightwords.addHighlightWithOptions', function () {
        highlight.addSelected(true)
    });

    commands.registerCommand('highlightwords.removeHighlight', function () {
        window.showQuickPick(highlight.getWords().concat([{ expression: '* All *', wholeWord: false, ignoreCase: false }]).map(w => {
            return {
                label: w.expression,
                description: (w.ignoreCase ? 'i' : '') + (w.wholeWord ? 'w' : ''),
                detail: ''
            }
        }))
            .then(word => {
                highlight.remove(word)
            })
    });

    commands.registerCommand('highlightwords.treeRemoveHighlight', e => {
        highlight.remove(e)
    })

    commands.registerCommand('highlightwords.treeHighlightOptions', e => {
        highlight.updateOptions(e.label)
    })

    commands.registerCommand('highlightwords.removeAllHighlights', function () {
        highlight.clearAll()
    });

    commands.registerCommand('highlightwords.toggleSidebar', function () {
        configValues.showSidebar = !configValues.showSidebar
        commands.executeCommand('setContext', 'showSidebar', configValues.showSidebar)
    });

    commands.registerCommand('highlightwords.setHighlightMode', function () {
        const modes = ['Default', 'Whole Word', 'Ignore Case', 'Both'].map((s, i) => highlight.getMode() == i ? s+' ✅' : s)
        window.showQuickPick(modes).then(option => {
            if (typeof option == 'undefined') return;

            highlight.setMode(modes.indexOf(option)) 
        })
    })
    
    function next(e) {
        const doc = window.activeTextEditor.document
        const ed = window.activeTextEditor
        const iAmHere = ed.selection.active
        const offset = doc.offsetAt(iAmHere)
        const text = doc.getText()
        const slice = text.slice(offset+1)
        const opts = e.highlight.ignoreCase ? 'i' : ''
        const expression = e.highlight.wholeWord ? '\\b' + e.highlight.expression + '\\b' : e.highlight.expression

        const re = new RegExp(expression, opts)
        const pos = slice.search(re)
        if(pos == -1) { // wrap
            if(offset !=0) {
                const home = new Position(0, 0)
                window.activeTextEditor.selection = new Selection(home, home)
                next(e)
            }
            return
        }
        const word = slice.match(re)
        const start = doc.positionAt(pos+offset+1)
        const end = new Position(start.line, start.character+word[0].length)
        window.activeTextEditor.revealRange(new Range(start, end))
        window.activeTextEditor.selection = new Selection(start, start)
    }

    commands.registerCommand('highlightwords.findNext', e => {
        next(e)
        //commands.executeCommand("workbench.action.findInFiles")

    });

    function prev(e) {
        const doc = window.activeTextEditor.document
        const ed = window.activeTextEditor
        const iAmHere = ed.selection.active
        const offset = doc.offsetAt(iAmHere)
        const text = doc.getText()
        const slice = text.slice(0, offset)
        const opts = e.highlight.ignoreCase ? 'gi' : 'g'
        const expression = e.highlight.wholeWord ? '\\b' + e.highlight.expression + '\\b' : e.highlight.expression

        const re = new RegExp(expression, opts)
        const pos = slice.search(re)
        if(pos == -1) { // wrap
            if(offset !=0) {
                const home = doc.positionAt(text.length-1)
                window.activeTextEditor.selection = new Selection(home, home)
                prev(e)
            }
            return
        }
        let word 
        let found
        let index

        while ((found = re.exec(slice)) !== null) {
            index = re.lastIndex
            word = found[0]
            console.log('last index', index)
          }


        const start = doc.positionAt(index - word.length)
        window.activeTextEditor.revealRange(new Range(start, start))
        window.activeTextEditor.selection = new Selection(start, start)
    }

    commands.registerCommand('highlightwords.findPrevious', e => {
        prev(e)
        
    });

    configValues = HighlightConfig.getConfigValues()
    highlight.setDecorators(configValues.decorators)
    commands.executeCommand('setContext', 'showSidebar', configValues.showSidebar)


    let activeEditor = window.activeTextEditor;
    if (activeEditor) {
        triggerUpdateDecorations();
    }

    workspace.onDidChangeConfiguration(() => {
        configValues = HighlightConfig.getConfigValues()
        highlight.setDecorators(configValues.decorators)
        highlight.setMode(configValues.defaultMode)
        commands.executeCommand('setContext', 'showSidebar', configValues.showSidebar)
    })

    window.onDidChangeVisibleTextEditors(function (editor) {
        highlight.updateDecorations();
    }, null, context.subscriptions);

    workspace.onDidChangeTextDocument(function (event) {
        activeEditor = window.activeTextEditor;
        if (activeEditor && event.document === activeEditor.document) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    var timeout: NodeJS.Timer = null;
    function triggerUpdateDecorations() {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            highlight.updateActive()
        }, 500);
    }

}

// this method is called when your extension is deactivated
export function deactivate() {
}