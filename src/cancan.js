(function (window) {

    window.Ability = function Ability (params) {
        this.init(params);
    }

    Ability.aliaseActions = {
       read: ['index', 'show'],
       create: ['new'],
       update: ['edit']
    };

    Ability.prototype.init = function(params) {
        if (params && params.rules) {
            this.rules = params.rules.map(function (rule) {
                return new Rule(rule);
            });
        } else {
            this.rules = [];
        }

        this.aliasedActions = {
           read: ['index', 'show'],
           create: ['new'],
           update: ['edit']
        };
    };


    Ability.prototype.can = function(action, subject) {
        var relevantRules = this.relevantRules(action, subject);
        // console.log('relevantRules', JSON.stringify(relevantRules));
        var match = relevantRules.find(function (rule) {
            return rule.matchesConditions(action, subject);
        });
        // console.log('match', JSON.stringify(match));
        if (match) {
            return match.base_behavior;
        } else {
            return false;
        }
    };

    Ability.prototype.cannot = function(action, subject) {
        return !this.can(action, subject);
    };

    Ability.prototype.setCan = function(action, subject, conditions) {
        this.rules.push(new Rule({
            base_behavior: true,
            action: action,
            subject: subject,
            conditions: conditions
        }));
    };

    Ability.prototype.setCannot = function(action, subject, conditions) {
        this.rules.push(new Rule({
            base_behavior: false,
            action: action,
            subject: subject,
            conditions: conditions
        }));
    };


    Ability.prototype.aliasAction = function(actions, alias) {
        this.validateTarget(alias);
        if (!Array.isArray(this.aliasedActions[alias])) {
            this.aliasedActions[alias] = [];
        }
        this.aliasedActions[alias] = this.aliasedActions[alias].concat(actions);
    };

    Ability.prototype.validateTarget = function(target) {
    };

    Ability.prototype.clearAliasedActions = function() {
        this.aliasedActions = {};
    };


    Ability.prototype.expandActions = function(actions) {
        var tmp = actions.map(function (action) {
            if (this.aliasedActions[action]) {
                return [action].concat(this.expandActions(this.aliasedActions[action]));
            } else {
                return action;
            }
        }, this).flatten();

        if (tmp.all(function (action) { return action === 'index' || action === 'show'; })) {
            tmp.push('read');
        }
        // if (tmp.find('new')) tmp.push('create');
        // if (tmp.find('edit')) tmp.push('update');

        return tmp.unique();
    };

    Ability.prototype.relevantRules = function(action, subject) {
        // Why reverse()?
        // Latest rule with the same subject would overwrite the front rule.
        return this.rules.slice(0).reverse().filter(function (rule) {
            rule.expandedActions = this.expandActions(rule.actions);
            return rule.isRelevant(action, subject);
        }, this);
    };

    window.Rule = function Rule (payload) {
        // console.log('init rule', payload.subject);
        this._raw = Object.clone(payload);

        this.base_behavior = payload.base_behavior;
        this.conditions = payload.conditions;

        if (payload.action) {
            this.actions = [payload.action].flatten();
        }
        if (payload.actions) {
            this.actions = payload.actions;
        }
        if (payload.subject) {
            this.subjects = [payload.subject].flatten();
        }
        if (payload.subjects) {
            this.subjects = payload.subjects;
        }

        var _expandActions = function (actions) {
            var tmp = actions.map(function (action) {
                if (Ability.aliaseActions[action]) {
                    return [action].concat(_expandActions(Ability.aliaseActions[action]));
                } else {
                    return action;
                }
            }).flatten();

            if (tmp.all(function (action) { return action === 'index' || action === 'show'; })) {
                tmp.push('read');
            }
            return tmp.unique();
        };

        this.expandedActions = _expandActions(this.actions);
    }

    Rule.prototype.isRelevant = function(action, subject) {
        var matcherA = this.matchesAction(action);
        var matcherB = this.matchesSubject(subject);
        // console.log('is relevant', (this.base_behavior ? 'can' : 'cannot'), matcherA, matcherB);
        return matcherA && matcherB;
    };

    // TODO action never being used
    Rule.prototype.matchesConditions = function(action, subject) {
        // console.log('matchesConditions', JSON.stringify(subject), JSON.stringify(this));

        if (Object.isObject(this.conditions) && !Object.isEmpty(this.conditions) && !this.isClass(subject)) {
            // model with conditions
            return this.matchesConditionsHash(subject);
        } else {
            if (Object.isEmpty(this.conditions)) {
                // Model or model without conditions
                return true;
            } else {
                return this.base_behavior;
            }
        }
    };

    Rule.prototype.isClass = function(subject) {
        return subject.constructor.name === 'Function';
    };

    Rule.prototype.matchesAction = function(action) {
        return this.expandedActions.find('manage') || this.expandedActions.find(action);
    };

    // <input>          <rule>
    // anything matches 'all'
    // Post, post, 'Post' match 'Post'
    Rule.prototype.matchesSubject = function(subject) {
        // return this.subjects.find('all') || this.subjects.find(subject) || this.matchesSubjectClass(subject) || (typeof(subject) === 'object' && this.subjects.find(subject.constructor.name));

        if (this.subjects.find('all')) return 'all';

        if (typeof(subject) === 'string') {
            return this.subjects.find(subject) || this.matchesSubjectClass(subject);
        }

        // Post
        if (typeof(subject) === 'function' && this.matchesSubjectClass(subject)) return 'yes';

        // post
        if (typeof(subject) === 'object') {
            // this.subjects is a function of array [function () {...}]
            if (this.matchesSubjectClass(subject.constructor.name)) return subject.constructor.name;
            // this.subjects is a string of array ['Post']
            if (this.subjects.find(subject.constructor.name)) return subject.constructor.name;
        }

        return false;
    };

    // @klass 'Post' || Post
    Rule.prototype.matchesSubjectClass = function(Klass) {
        if (typeof Klass === 'string') {
            try {
                Klass = eval(Klass);
            } catch (err) {
                // When function is not exist
                return false;
            }
        }

        return this.subjects.slice().any(function (sub) {
            return eval(sub) === Klass;
        });
    };

    Rule.prototype.matchesConditionsHash = function(subject, conditions) {
        var me = this;
        if (!conditions) {
            conditions = this.conditions;
        }
        if (Object.isEmpty(conditions)) {
            return true;
        } else {
            // All of conditions must be satisified.
            return Object.all(conditions, function (key, value) {
                var attr = subject[key];
                if (Object.isObject(value)) {
                    if (Array.isArray(attr)) {
                        return attr.any(function (element) {
                            return this.matchesConditionsHash(element, value);
                        }, me);
                    } else {
                        return attr && me.matchesConditionsHash(attr, value);
                    }
                } else if (Array.isArray(value)) {
                    var re = new RegExp(attr.join('|'));
                    return value.all(re) || value.sortBy('length').toString() === attr.sortBy('length').toString(); // TODO
                } else {
                    return attr === value;
                }
            });
        }
    };

})(window);

