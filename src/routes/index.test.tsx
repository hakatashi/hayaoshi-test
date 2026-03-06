import {Route, Router} from '@solidjs/router';
import {render, waitFor} from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import {expect, test} from 'vitest';
import Index from './index.js';

const user = userEvent.setup();

const renderWithRouter = () =>
	render(() => (
		<Router>
			<Route path="/" component={Index} />
		</Router>
	));

test('has create room button', async () => {
	const {findByRole} = renderWithRouter();
	const createRoomButton = await findByRole('button');
	expect(createRoomButton).toHaveTextContent('Create Room');
});

test('initially shows no rooms', async () => {
	const {queryAllByRole} = renderWithRouter();

	// Wait for Firestore loading to complete
	await waitFor(
		() => {
			const items = queryAllByRole('listitem');
			expect(items).toHaveLength(0);
		},
		{timeout: 5000},
	);
});

test('is able to create a room', async () => {
	const {getByRole, getAllByRole} = renderWithRouter();

	// Wait for auth state to be ready (button becomes enabled)
	await waitFor(
		() => {
			const button = getByRole('button');
			expect(button).not.toBeDisabled();
		},
		{timeout: 5000},
	);

	const roomInput = getByRole('textbox');
	expect(roomInput).toHaveValue('');

	// Type room name and submit
	await user.type(roomInput, 'Test Room');
	await user.click(getByRole('button'));

	// Input should be cleared after submission
	await waitFor(
		() => {
			expect(getByRole('textbox')).toHaveValue('');
		},
		{timeout: 10000},
	);

	// New room should appear in the list
	await waitFor(
		() => {
			const items = getAllByRole('listitem');
			expect(items).toHaveLength(1);
			expect(items[0]).toHaveTextContent('Test Room');
		},
		{timeout: 10000},
	);
});
