'use strict';

console.log = jasmine.createSpy('log');

function Post(payload) {
    if (payload) {
        this.id = payload.id || 1;
        this.title = payload.title || 'Hello';
        this.body = payload.body || 'This is a blog post';
        this.tags = payload.tags || [];
        this.comment = payload.comment || {};
    } else {
        this.id = 1;
        this.title = 'Hello';
        this.body = 'This is a blog post';
        this.tags = [];
        this.comment = {};
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
        a.aliasAction(['create', 'update', 'delete'], 'manage');
        a.aliasAction(['manage_metting', 'manage_sharer'], 'update');
        a.setCan('manage', Post);
        expect(a.can('manage_metting', new Post())).toBe(true);
        expect(a.can('create', new Post())).toBe(true);
    });

    it('should automatically alias index and show into read calls', function() {
        var a = new Ability();
        a.setCan('read', 'all');
        expect(a.can('index', 123)).toBe(true);
        expect(a.can('show', 123)).toBe(true);
    });

    it('should automatically alias new and edit into create and update calls', function() {
        var a = new Ability();
        a.setCan('create', 'all');
        a.setCan('update', 'all');
        expect(a.can('new', 123)).toBe(true);
        expect(a.can('edit', 123)).toBe(true);
    });

    it('should be able to specify multiple actions and match any', function() {
        var a = new Ability();
        a.setCan(['read', 'update'], 'all');
        expect(a.can('read', 123)).toBe(true);
        expect(a.can('update', 123)).toBe(true);
        expect(a.cannot('count', 123)).toBe(true);
    });

    it('should be able to specify multiple classes and match any instances', function() {
        var a = new Ability();
        a.setCan('update', [Post, Comment]);
        expect(a.can('update', new Post())).toBe(true);
        expect(a.can('update', new Comment())).toBe(true);
        expect(a.cannot('update', new RegExp())).toBe(true);
    });

    it('should be able to specify multiple classes and match any classes', function() {
        var a = new Ability();
        a.setCan('update', [Post, Comment]);
        expect(a.can('update', Post)).toBe(true);
        expect(a.can('update', Comment)).toBe(true);
        expect(a.cannot('update', RegExp)).toBe(true);
    });

    it('should support custom objects in the rule', function() {
        var a = new Ability();
        a.setCan('read', 'stats')
        expect(a.can('read', 'stats')).toBe(true);
        expect(a.cannot('update', 'stats')).toBe(true);
        expect(a.cannot('read', 'nonstats')).toBe(true);
    });

    it('should support "cannot" method to define what user cannot do', function() {
        var a = new Ability();
        a.setCan('read', 'all');
        a.setCannot('read', Post);
        expect(a.can('read', 'foo')).toBe(true);
        expect(a.cannot('read', new Post())).toBe(true);
    });

    it('should append aliased actions', function() {
        var a = new Ability();
        a.aliasAction(['update'], 'modify');
        a.aliasAction(['destroy'], 'modify');
        expect(a.aliasedActions['modify'].all(/update|destroy/)).toBe(true);
    });

    it('should clear aliased actions', function () {
        var a = new Ability();
        a.aliasAction(['update'], 'modify')
        a.clearAliasedActions()
        expect(a.aliasedActions['modify']).toBeUndefined();
    });

    it('should use conditions as third parameter and determine abilities from it', function () {
        var a = new Ability();
        a.setCan('read', Post, { title: 'Hello'});
        expect(a.can('read', new Post({ title: 'Hello' }))).toBe(true);
        expect(a.cannot('read', new Post({ title: 'Goodbye' }))).toBe(true);
        expect(a.can('read', Post)).toBe(true); // TODO NOT SURE
    });

    it('should allow an array of options in conditions hash', function () {
        var a = new Ability();
        a.setCan('read', Post, {
            tags: ['awesome', 'cool', 'pretty']
        });
        expect(a.can('read', new Post({
            tags: ['awesome', 'cool', 'pretty']
        }))).toBe(true);
        expect(a.cannot('read', new Post({
            tags: ['ugly', 'bad']
        }))).toBe(true);
    });

    it('should allow nested hashes in conditions hash', function () {
        var a = new Ability();
        a.setCan('read', Post, {
            comment: {
                user_id: 1
            }
        });
        expect(a.can('read', new Post({
            comment: {
                user_id: 1
            }
        }))).toBe(true);
        expect(a.cannot('read', new Post({
            comment: {
                user_id: 2
            }
        }))).toBe(true);
    });

    it('should allow false values conditions hash', function () {
        var a = new Ability();
        a.setCan('read', Post, {
            comment: {
                is_protected: false
            }
        });
        expect(a.can('read', new Post({
            comment: {
                is_protected: false
            }
        }))).toBe(true);
        expect(a.cannot('read', new Post({
            comment: {
                is_protected: true
            }
        }))).toBe(true);
    });

    it('should not stop at cannot definition when comparing class', function () {
        var a = new Ability();
        a.setCan('read', Post);
        a.setCannot('read', Post, {
            id: 1
        });
        expect(a.can('read', new Post({
            id: 2
        }))).toBe(true);
        expect(a.cannot('read', new Post({
            id: 1
        }))).toBe(true);
        expect(a.can('read', Post)).toBe(true);
    });

    it('should stop at cannot definition when no hash is present', function () {
        var a = new Ability();
        a.setCan('read', 'all');
        a.setCannot('read', Post);
        expect(a.cannot('read', new Post())).toBe(true);
        expect(a.cannot('read', Post)).toBe(true);
    });

    it('should work when definition passing a block function', function () {
        var a = new Ability();
        a.setCan('read', 'Post', function (post) {
            return post.id === 2;
        });
        expect(a.can('read', new Post({ id: 2}))).toBe(true);
        expect(a.cannot('read', new Post({ id: 1}))).toBe(true);
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
