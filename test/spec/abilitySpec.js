'use strict';

function Post(payload) {
    if (payload) {
        this.id = payload.id || 1;
        this.title = payload.title || 'Hello';
        this.body = payload.body || 'This is a blog post';
    } else {
        this.id = 1;
        this.title = 'Hello';
        this.body = 'This is a blog post';
    }
}

function Comment(payload) {
    if (payload) {
        this.id = payload.id || 1;
        this.post_id = payload.post_id;
        this.body = payload.body || 'This is a comment';
    } else {
        this.id = 1;
        this.post_id = null;
        this.body = 'This is a comment';
    }
}

describe('Ability', function() {

    beforeEach(function() {

    });

    var existing = {
        rules: [{
            base_behavior: true,
            subjects: ["Post"],
            actions: ["index", "show"],
            conditions: {
                id: 1
            }
        }, {
            base_behavior: true,
            subjects: ['Comment'],
            actions: ['new', 'index', 'show']
        }, {
            base_behavior: true,
            subjects: ['Comment'],
            actions: ['edit', 'destroy'],
            conditions: {
                post_id: 1
            }
        }]
    };

    it('expand actions', function() {
        var a = new Ability();
        expect(a.expandActions(['read'])).toContain('index');
        expect(a.expandActions(['read'])).toContain('show');
        expect(a.expandActions(['create'])).toContain('new');
        expect(a.expandActions(['update'])).toContain('edit');
        expect(a.expandActions(['index', 'show'])).toContain('read');
        expect(a.expandActions(['edit'])).not.toContain('update');
        expect(a.expandActions(['new'])).not.toContain('create');
    });

    it('relevant rules', function() {
        var a = new Ability(existing);
        var post = new Post({
            id: 1
        });
        expect(a.relevantRules('index', post).length > 0).toBe(true);
        expect(a.relevantRules('update', post).length > 0).toBe(false);
        expect(a.relevantRules('index', Comment).length > 0).toBe(true);
    });

    it('can read posts', function() {
        var a = new Ability(existing);
        var post = new Post({
            id: 1
        });
        expect(a.can('index', post)).toBe(true);
        expect(a.can('show', post)).toBe(true);
        expect(a.can('read', post)).toBe(true);
    });

    it('should work when passing in existing object with rules and subject', function() {
        var a = new Ability(existing);
        expect(a.cannot('index', new Post({
            id: 2
        }))).toBe(true);
        expect(a.cannot('destroy', new Post({
            id: 1
        }))).toBe(true);
        expect(a.cannot('destroy', Post)).toBe(true);
        expect(a.cannot('new', Post)).toBe(true);
        expect(a.cannot('create', Post)).toBe(true);
        expect(a.can('new', Comment)).toBe(true);
        expect(a.can('edit', new Comment({
            post_id: 1
        }))).toBe(true);
        expect(a.cannot('edit', new Comment({
            post_id: 2
        }))).toBe(true);
    });

    it('should work on model', function() {
        var a = new Ability();
        a.setCan('read', Post);
        expect(a.can('read', Post)).toBe(true);
    });

    it('should work on model name as string', function() {
        var a = new Ability();
        a.setCan('read', Post);
        expect(a.can('read', 'Post')).toBe(true); // todo
    });

    it('should be able to "read" anything', function() {
        var a = new Ability();
        a.setCan('read', 'all');
        expect(a.can('read', String)).toBe(true);
        expect(a.can('read', 123)).toBe(true);
    });

    it('should not have permission to do something it doesn\'t know about', function() {
        var a = new Ability();
        expect(a.cannot('sorting', Post)).toBe(true);
    });

    it('should alias update or destroy actions to modify action', function() {
        var a = new Ability();
        a.aliasAction(["update", "destroy"], "modify");
        a.setCan("modify", "all");
        expect(a.can("update", 123)).toBe(true);
        expect(a.can("destroy", 123)).toBe(true);
    });

    it('should allow deeply nested aliased actions', function() {
        var a = new Ability();
        a.aliasAction(['increment'], 'sort');
        a.aliasAction(['sort'], 'modify');
        a.setCan('modify', 'all');
        expect(a.can('sort', 123)).toBe(true);
        expect(a.can('modify', 123)).toBe(true);
        expect(a.can('increment', 123)).toBe(true);
    });

    it('should automatically alias index and show into read calls', function () {
        var a = new Ability();
        a.setCan('read', 'all');
        expect(a.can('index', 123)).toBe(true);
        expect(a.can('show', 123)).toBe(true);
    });

    it('should automatically alias new and edit into create and update calls', function () {
        var a = new Ability();
        a.setCan('create', 'all');
        a.setCan('update', 'all');
        expect(a.can('new', 123)).toBe(true);
        expect(a.can('edit', 123)).toBe(true);
    });

    it('should be able to specify multiple actions and match any', function () {
        var a = new Ability();
        a.setCan(['read', 'update'], 'all');
        expect(a.can('read', 123)).toBe(true);
        expect(a.can('update', 123)).toBe(true);
        expect(a.cannot('count', 123)).toBe(true);
    });

    it('should be able to specify multiple classes and match any instances', function () {
        var a = new Ability();
        a.setCan('update', [Post, Comment]);
        expect(a.can('update', new Post())).toBe(true);
        expect(a.can('update', new Comment())).toBe(true);
        expect(a.cannot('update', new RegExp())).toBe(true);
    });

    it('should be able to specify multiple classes and match any classes', function () {
        var a = new Ability();
        a.setCan('update', [Post, Comment]);
        expect(a.can('update', Post)).toBe(true);
        expect(a.can('update', Comment)).toBe(true);
        expect(a.cannot('update', RegExp)).toBe(true);
    });

    it('should support custom objects in the rule', function () {
        var a = new Ability();
        a.setCan('read', 'stats')
        expect(a.can('read', 'stats')).toBe(true);
        expect(a.cannot('update', 'stats')).toBe(true);
        expect(a.cannot('read', 'nonstats')).toBe(true);
    });
});

describe('Rule fundamental', function() {

    var rule;

    beforeEach(function() {
        rule = new Rule({
            base_behavior: true,
            subjects: ["Post"],
            actions: ["read"]
        });
    });

    it('matchesSubject()', function() {
        expect(rule.matchesSubject('Post').length > 0).toBe(true);
        var post = new Post();
        expect(rule.matchesSubject(post).length > 0).toBe(true);
        expect(rule.matchesSubject(Post).length > 0).toBe(true);
    });

    it('matchesSubjectClass() with name of class', function() {
        expect(rule.matchesSubjectClass('Post')).toBe(true);
    });

    it('matchesSubjectClass() with class', function() {
        expect(rule.matchesSubjectClass(Post)).toBe(true);
    });
});


describe('Rule with conditions', function() {

    var rule;

    beforeEach(function() {
        rule = new Rule({
            base_behavior: true,
            subjects: ["Post"],
            actions: ["index", "show"],
            conditions: {
                id: 1
            }
        });
    });

    it('should match Class subject', function() {
        expect(rule.matchesSubject(Post).length > 0).toBe(true);
        expect(rule.matchesSubject('Post').length > 0).toBe(true);
        expect(rule.matchesSubject('Comment').length > 0).toBe(false);
    });

    it('should match Instance subject', function() {
        var post = new Post();
        expect(rule.matchesSubject(post).length > 0).toBe(true);
    });

    it('should match action', function() {
        expect(rule.matchesAction('index')).toBe('index');
    });

    it('should identify class variable', function() {
        expect(rule.isClass(Post)).toBe(true);
    });

    it('should identify instance variable', function() {
        expect(rule.isClass(new Post())).toBe(false);
    });

    it('should match conditions if subject correspond to hash conditions', function() {
        expect(rule.matchesConditionsHash(new Post({
            id: 1
        }), {
            id: 1
        })).toBe(true);
    });

    it('should missmatch conditions if subject is not correspond to hash conditions', function() {
        expect(rule.matchesConditionsHash(new Post({
            id: 1
        }), {
            id: 2
        })).toBe(false);
    });

    it('should relevant to Instance', function() {
        expect(rule.isRelevant('show', new Post({
            id: 1
        }))).toEqual('Post');
    });

    it('irrelevant rule', function() {
        expect(rule.isRelevant('update', new Post({
            id: 1
        }))).not.toEqual('Post');
    });

});

describe('Rule without conditions', function() {
    var rule;

    beforeEach(function() {
        rule = new Rule({
            base_behavior: true,
            subjects: ["Post"],
            actions: ["read"]
        });
    });

    it('should match if conditions is empty', function() {
        expect(rule.matchesConditionsHash('Post')).toBe(true);
        expect(rule.matchesConditionsHash('Post', {})).toBe(true);
    });

    it('should relevant to Class', function() {
        expect(rule.isRelevant('index', Post).length > 0).toBe(true);
    });

});
