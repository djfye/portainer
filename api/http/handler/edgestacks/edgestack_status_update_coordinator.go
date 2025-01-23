package edgestacks

import (
	"errors"
	"fmt"
	"net/http"

	portainer "github.com/portainer/portainer/api"
	"github.com/portainer/portainer/api/dataservices"

	"github.com/rs/zerolog/log"
)

type statusRequest struct {
	r        *http.Request
	respCh   chan statusResponse
	endpoint *portainer.Endpoint
	stackID  portainer.EdgeStackID
	payload  updateStatusPayload
}

type statusResponse struct {
	Stack *portainer.EdgeStack
	Error error
}

type statusUpdateFn func(stack *portainer.EdgeStack, endpoint *portainer.Endpoint, r *http.Request, stackID portainer.EdgeStackID, payload updateStatusPayload) (*portainer.EdgeStack, error)

type EdgeStackStatusUpdateCoordinator struct {
	updateCh       chan statusRequest
	dataStore      dataservices.DataStore
	statusUpdateFn statusUpdateFn
}

var errAnotherStackUpdateInProgress = errors.New("another stack update is in progress")

func NewEdgeStackStatusUpdateCoordinator(
	dataStore dataservices.DataStore,
	statusUpdateFn statusUpdateFn,
) *EdgeStackStatusUpdateCoordinator {
	return &EdgeStackStatusUpdateCoordinator{
		updateCh:       make(chan statusRequest),
		dataStore:      dataStore,
		statusUpdateFn: statusUpdateFn,
	}
}

func (c *EdgeStackStatusUpdateCoordinator) Start() {
	for {
		c.loop()
	}
}

func (c *EdgeStackStatusUpdateCoordinator) loop() {
	u := <-c.updateCh

	respChs := []chan statusResponse{u.respCh}

	var stack *portainer.EdgeStack

	err := c.dataStore.UpdateTx(func(tx dataservices.DataStoreTx) error {
		// 1. Load the edge stack
		var err error

		stack, err = loadEdgeStack(tx, u.stackID)
		if err != nil {
			return err
		}

		// 2. Mutate the edge stack opportunistically until there are no more pending updates
		for {
			stack, err = c.statusUpdateFn(stack, u.endpoint, u.r, stack.ID, u.payload)
			if err != nil {
				return err
			}

			if m, ok := c.getNextUpdate(stack.ID); ok {
				u = m
			} else {
				break
			}

			respChs = append(respChs, u.respCh)
		}

		// 3. Save the changes back to the database
		if err := tx.EdgeStack().UpdateEdgeStack(stack.ID, stack); err != nil {
			return handlerDBErr(fmt.Errorf("unable to update Edge stack: %w.", err), "Unable to persist the stack changes inside the database")
		}

		return nil
	})

	// 4. Send back the responses
	for _, ch := range respChs {
		ch <- statusResponse{Stack: stack, Error: err}
	}
}

func loadEdgeStack(tx dataservices.DataStoreTx, stackID portainer.EdgeStackID) (*portainer.EdgeStack, error) {
	stack, err := tx.EdgeStack().EdgeStack(stackID)
	if err != nil {
		if dataservices.IsErrObjectNotFound(err) {
			// Skip the error when the agent tries to update the status on a deleted stack
			log.Debug().
				Err(err).
				Int("stackID", int(stackID)).
				Msg("Unable to find a stack inside the database, skipping error")

			return nil, nil
		}

		return nil, fmt.Errorf("unable to retrieve Edge stack from the database: %w.", err)
	}

	return stack, nil
}

func (c *EdgeStackStatusUpdateCoordinator) getNextUpdate(stackID portainer.EdgeStackID) (statusRequest, bool) {
	for {
		select {
		case u := <-c.updateCh:
			// Discard the update and let the agent retry
			if u.stackID != stackID {
				u.respCh <- statusResponse{Error: errAnotherStackUpdateInProgress}

				continue
			}

			return u, true

		default:
			return statusRequest{}, false
		}
	}
}

func (c *EdgeStackStatusUpdateCoordinator) UpdateStatus(
	r *http.Request,
	endpoint *portainer.Endpoint,
	stackID portainer.EdgeStackID,
	payload updateStatusPayload) (
	*portainer.EdgeStack,
	error,
) {
	respCh := make(chan statusResponse)
	defer close(respCh)

	msg := statusRequest{
		respCh:   respCh,
		r:        r,
		endpoint: endpoint,
		stackID:  stackID,
		payload:  payload,
	}

	select {
	case c.updateCh <- msg:
		r := <-respCh

		return r.Stack, r.Error

	case <-r.Context().Done():
		return nil, r.Context().Err()
	}
}
